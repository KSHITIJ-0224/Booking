const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Seat = require('../models/Seat');
const Reservation = require('../models/Reservation');
const { protect } = require('../middleware/auth');

// @route   POST /api/reserve
// @desc    Reserve available seats for 10 minutes
// @access  Private
router.post('/reserve', protect, async (req, res) => {
  try {
    const { eventId, seatNumbers } = req.body;

    if (!eventId || !seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({ message: 'Invalid request data. eventId and seatNumbers array are required.' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

    // ATOMIC RESERVATION PROCESS:
    // Update seats where status is 'available' OR status is 'reserved' but has expired
    const result = await Seat.updateMany(
      {
        eventId,
        seatNumber: { $in: seatNumbers },
        $or: [
          { status: 'available' },
          { status: 'reserved', expiresAt: { $lt: now } }
        ]
      },
      {
        $set: {
          status: 'reserved',
          reservedBy: req.user._id,
          expiresAt: expiresAt
        }
      }
    );

    // If we could not reserve ALL requested seats, it means a double-booking/concurrency conflict occurred
    if (result.modifiedCount !== seatNumbers.length) {
      // ROLLBACK: release the seats we did manage to reserve in this query
      await Seat.updateMany(
        {
          eventId,
          seatNumber: { $in: seatNumbers },
          status: 'reserved',
          reservedBy: req.user._id,
          expiresAt: expiresAt // Match the exact expiresAt value we set
        },
        {
          $set: {
            status: 'available',
            reservedBy: null,
            expiresAt: null
          }
        }
      );

      // Identify which specific seats are unavailable to report back
      const currentSeats = await Seat.find({ eventId, seatNumber: { $in: seatNumbers } });
      const unavailable = currentSeats
        .filter(s => {
          const isReservedActive = s.status === 'reserved' && s.expiresAt >= now;
          return s.status === 'booked' || isReservedActive;
        })
        .map(s => s.seatNumber);

      return res.status(409).json({
        message: 'Some of the selected seats are no longer available.',
        unavailableSeats: unavailable.length > 0 ? unavailable : seatNumbers
      });
    }

    // Success! Create the Reservation record
    const reservation = await Reservation.create({
      userId: req.user._id,
      eventId,
      seatNumbers,
      expiresAt
    });

    res.status(201).json({
      message: 'Seats reserved successfully for 10 minutes.',
      reservationId: reservation._id,
      eventId,
      seatNumbers,
      expiresAt
    });
  } catch (error) {
    console.error('Reservation error:', error);
    res.status(500).json({ message: 'Server error, failed to reserve seats.' });
  }
});

// @route   POST /api/bookings
// @desc    Confirm booking (marks seats as booked and removes the reservation)
// @access  Private
router.post('/bookings', protect, async (req, res) => {
  try {
    const { reservationId } = req.body;

    if (!reservationId) {
      return res.status(400).json({ message: 'reservationId is required.' });
    }

    // 1. Find the reservation
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found or has expired.' });
    }

    // 2. Check if the reservation has expired
    const now = new Date();
    if (reservation.expiresAt <= now) {
      // The reservation is expired. Clean up the seats
      await Seat.updateMany(
        {
          eventId: reservation.eventId,
          seatNumber: { $in: reservation.seatNumbers },
          status: 'reserved',
          reservedBy: req.user._id
        },
        {
          $set: {
            status: 'available',
            reservedBy: null,
            expiresAt: null
          }
        }
      );

      // Delete the expired reservation record
      await Reservation.deleteOne({ _id: reservationId });

      return res.status(400).json({ message: 'Your reservation has expired (10-minute limit exceeded). Please select seats again.' });
    }

    // 3. Mark the seats as booked and clear reservation properties
    const seatResult = await Seat.updateMany(
      {
        eventId: reservation.eventId,
        seatNumber: { $in: reservation.seatNumbers },
        status: 'reserved',
        reservedBy: req.user._id
      },
      {
        $set: {
          status: 'booked',
          reservedBy: null,
          expiresAt: null
        }
      }
    );

    // Verify all seats from the reservation were updated
    if (seatResult.modifiedCount !== reservation.seatNumbers.length) {
      return res.status(400).json({ message: 'Booking failed. Some seats are no longer reserved for you.' });
    }

    // 4. Delete the reservation document
    await Reservation.deleteOne({ _id: reservationId });

    res.status(200).json({
      message: 'Booking confirmed successfully!',
      eventId: reservation.eventId,
      seatNumbers: reservation.seatNumbers
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ message: 'Server error, failed to confirm booking.' });
  }
});

module.exports = router;
