const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Seat = require('../models/Seat');

// @route   GET /api/events
// @desc    Get all events
// @access  Public
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({}).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error, failed to fetch events' });
  }
});

// @route   GET /api/events/:id
// @desc    Get single event details and seat list
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const now = new Date();

    // 1. Automatically release seats that have expired reservations
    await Seat.updateMany(
      {
        eventId: event._id,
        status: 'reserved',
        expiresAt: { $lt: now }
      },
      {
        $set: {
          status: 'available',
          reservedBy: null,
          expiresAt: null
        }
      }
    );

    // 2. Fetch seats for the event
    let seats = await Seat.find({ eventId: event._id }).sort({ seatNumber: 1 });

    // 3. Resilient seat generation if they don't exist yet
    if (seats.length === 0) {
      const seatList = [];
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const seatsPerRow = Math.ceil(event.totalSeats / rows.length);
      let count = 0;

      for (let r = 0; r < rows.length && count < event.totalSeats; r++) {
        for (let s = 1; s <= seatsPerRow && count < event.totalSeats; s++) {
          seatList.push({
            eventId: event._id,
            seatNumber: `${rows[r]}${s}`,
            status: 'available'
          });
          count++;
        }
      }

      seats = await Seat.insertMany(seatList);
    }

    // Format the response
    res.json({
      event,
      seats: seats.map(s => {
        // Return structured information. Clear expired fields for representation
        const isExpired = s.status === 'reserved' && s.expiresAt && s.expiresAt < now;
        return {
          _id: s._id,
          seatNumber: s.seatNumber,
          status: isExpired ? 'available' : s.status,
          reservedBy: isExpired ? null : s.reservedBy,
          expiresAt: isExpired ? null : s.expiresAt
        };
      })
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(500).json({ message: 'Server error, failed to fetch event details' });
  }
});

module.exports = router;
