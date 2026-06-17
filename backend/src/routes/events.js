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

// @route   GET /api/events/seed
// @desc    Seed events and seats database
// @access  Public
router.get('/seed', async (req, res) => {
  try {
    const Reservation = require('../models/Reservation');

    const eventsData = [
      {
        name: 'Cyberpunk Electro Festival 2026',
        description: 'Immerse yourself in a neon-drenched night of electronic synthesis and high-energy bass beats, featuring top underground synthwave artists.',
        date: new Date('2026-08-15T20:00:00Z'),
        venue: 'Neon Grid Arena, Sector 7',
        totalSeats: 60,
        price: 75,
        image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800'
      },
      {
        name: 'Interstellar Symphony Orchestra',
        description: 'An audio-visual orchestral masterpiece showcasing cosmic visualizers and galactic orchestrations from classical film themes.',
        date: new Date('2026-09-22T19:30:00Z'),
        venue: 'Celestial Dome Theater, Level 4',
        totalSeats: 48,
        price: 120,
        image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&q=80&w=800'
      },
      {
        name: 'Antigravity Developer Summit',
        description: 'Join the industry leaders in agentic software engineering for a multi-day conference of deep-dive keynotes, hands-on labs, and networks.',
        date: new Date('2026-10-05T09:00:00Z'),
        venue: 'Google DeepMind Center, London Hub',
        totalSeats: 40,
        price: 45,
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800'
      }
    ];

    // Clear existing collections
    await Event.deleteMany({});
    await Seat.deleteMany({});
    await Reservation.deleteMany({});

    // Seed Events
    const createdEvents = await Event.insertMany(eventsData);

    // Generate seats for each event
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    let totalSeatsSeeded = 0;

    for (const event of createdEvents) {
      const seatList = [];
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

      await Seat.insertMany(seatList);
      totalSeatsSeeded += seatList.length;
    }

    res.json({
      message: 'Database seeded successfully!',
      eventsCount: createdEvents.length,
      seatsCount: totalSeatsSeeded
    });
  } catch (error) {
    console.error('Seeding error:', error);
    res.status(500).json({ error: error.message });
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
