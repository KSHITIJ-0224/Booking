import React, { useState, useEffect } from 'react';
import { ChevronLeft, Calendar, MapPin, DollarSign, Lock, CheckCircle, ShieldAlert, Timer } from 'lucide-react';
import { eventAPI, bookingAPI } from '../api';
import SeatGrid from './SeatGrid';
import TicketPass from './TicketPass';

export default function BookingFlow({ eventId, onBack, user, onOpenAuth, addToast }) {
  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingStatus, setBookingStatus] = useState('idle'); // idle, reserving, reserved, booking, confirmed
  const [reservation, setReservation] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [bookingResult, setBookingResult] = useState(null);

  const fetchEventDetails = async () => {
    try {
      const data = await eventAPI.getEventDetails(eventId);
      setEvent(data.event);
      setSeats(data.seats);
    } catch (err) {
      console.error(err);
      addToast({
        title: 'Error Loading Details',
        message: err.message || 'Failed to load event details.',
        type: 'error',
      });
      onBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  // Reservation countdown timer
  useEffect(() => {
    if (bookingStatus !== 'reserved' || !reservation) return;

    const calculateTimeLeft = () => {
      const expires = new Date(reservation.expiresAt).getTime();
      const now = new Date().getTime();
      return Math.max(0, Math.floor((expires - now) / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        addToast({
          title: 'Reservation Expired',
          message: 'Your 10-minute reservation has expired. The seats have been released.',
          type: 'warning',
        });
        // Reset states
        setReservation(null);
        setSelectedSeats([]);
        setBookingStatus('idle');
        fetchEventDetails(); // Reload fresh seats
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation, bookingStatus]);

  const handleSelectSeat = (seatNumber) => {
    if (bookingStatus === 'reserved') return; // Cannot change selection once reserved

    setSelectedSeats((prev) =>
      prev.includes(seatNumber)
        ? prev.filter((s) => s !== seatNumber)
        : [...prev, seatNumber]
    );
  };

  const handleReserve = async () => {
    if (!user) {
      addToast({
        title: 'Authentication Required',
        message: 'Please log in or register to reserve seats.',
        type: 'info',
      });
      onOpenAuth();
      return;
    }

    if (selectedSeats.length === 0) {
      addToast({
        title: 'No Seats Selected',
        message: 'Please select at least one seat to reserve.',
        type: 'warning',
      });
      return;
    }

    setBookingStatus('reserving');
    try {
      const data = await bookingAPI.reserveSeats(event._id, selectedSeats);
      setReservation(data);
      setBookingStatus('reserved');
      addToast({
        title: 'Seats Reserved',
        message: 'Seats held for 10 minutes. Please confirm your booking.',
        type: 'success',
      });
      fetchEventDetails(); // Refresh grid layout (shows them as reserved)
    } catch (err) {
      console.error(err);
      setBookingStatus('idle');
      
      // Handle seat unavailability conflict
      if (err.status === 409 && err.data?.unavailableSeats) {
        const unavailable = err.data.unavailableSeats.join(', ');
        addToast({
          title: 'Seats Unavailable',
          message: `Seats [${unavailable}] became unavailable. Please select other seats.`,
          type: 'error',
          duration: 8000,
        });
        // Clear unavailable seats from user's selection
        setSelectedSeats(prev => prev.filter(s => !err.data.unavailableSeats.includes(s)));
      } else {
        addToast({
          title: 'Reservation Failed',
          message: err.message || 'Could not reserve seats. Please try again.',
          type: 'error',
        });
      }
      fetchEventDetails(); // Refresh grid
    }
  };

  const handleConfirmBooking = async () => {
    if (!reservation) return;

    setBookingStatus('booking');
    try {
      const data = await bookingAPI.confirmBooking(reservation.reservationId);
      setBookingResult(data);
      setBookingStatus('confirmed');
      addToast({
        title: 'Booking Confirmed!',
        message: 'Your tickets have been successfully booked.',
        type: 'success',
      });
    } catch (err) {
      console.error(err);
      setBookingStatus('reserved'); // Maintain reserved status if something went wrong but we still have time
      
      addToast({
        title: 'Booking Failed',
        message: err.message || 'Failed to complete booking.',
        type: 'error',
      });
      
      // If error represents expiration or reservation missing, reset entirely
      if (err.status === 400 || err.status === 440 || err.status === 404) {
        setReservation(null);
        setSelectedSeats([]);
        setBookingStatus('idle');
        fetchEventDetails();
      }
    }
  };

  const handleCancelReservation = () => {
    // Just reset client side, server TTL will clear seats or we let it expire
    // For a smoother UX, we'll reset selected status
    setReservation(null);
    setSelectedSeats([]);
    setBookingStatus('idle');
    addToast({
      title: 'Reservation Cancelled',
      message: 'Your reservation has been released.',
      type: 'info',
    });
    fetchEventDetails();
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(0, 240, 255, 0.1)', borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (bookingStatus === 'confirmed' && bookingResult) {
    return (
      <div>
        <div className="flow-header">
          <h2 className="title-display" style={{ fontSize: '2rem' }}>Booking Success</h2>
        </div>
        <TicketPass
          booking={bookingResult}
          event={event}
          user={user}
          onReset={() => {
            setSelectedSeats([]);
            setReservation(null);
            setBookingStatus('idle');
            setBookingResult(null);
            onBack();
          }}
        />
      </div>
    );
  }

  const totalPrice = selectedSeats.length * (event?.price || 0);

  return (
    <div>
      <div className="flow-header">
        <button className="back-btn" onClick={onBack} disabled={bookingStatus === 'booking'}>
          <ChevronLeft size={18} /> BACK TO EVENTS
        </button>
        <div className="flow-header-title">
          <h2 className="title-display" style={{ fontSize: '1.75rem', background: 'linear-gradient(135deg, white, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {event.name}
          </h2>
        </div>
      </div>

      <div className="booking-flow-container">
        {/* Seat Selection Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={14} color="var(--color-primary)" />
              {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MapPin size={14} color="var(--color-primary)" />
              {event.venue}
            </span>
          </div>

          <SeatGrid
            seats={seats}
            selectedSeats={selectedSeats}
            onSelectSeat={handleSelectSeat}
          />
        </div>

        {/* Action Panel Sidebar */}
        <div>
          <div className="booking-panel glass-panel">
            <h3 className="panel-title title-display">Booking Summary</h3>
            
            <div className="panel-event-detail">
              <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{event.name}</div>
              <div className="panel-event-meta">
                <MapPin size={12} /> {event.venue}
              </div>
            </div>

            {/* Selected Seats summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="booking-summary-row">
                <span>Selected Seats</span>
                <span style={{ fontWeight: 600, color: selectedSeats.length > 0 ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                  {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
                </span>
              </div>
              <div className="booking-summary-row">
                <span>Price per seat</span>
                <span style={{ fontWeight: 600 }}>${event.price}</span>
              </div>
              <div className="booking-summary-row total">
                <span>Total Due</span>
                <span style={{ color: 'var(--color-success)' }}>${totalPrice}</span>
              </div>
            </div>

            {/* Reservation Expire Countdown */}
            {bookingStatus === 'reserved' && reservation && (
              <div className="timer-container">
                <Timer size={16} />
                <span>Reservation Expires:</span>
                <span className="timer-digits">{formatTimer(timeLeft)}</span>
              </div>
            )}

            {/* CTA Buttons */}
            {bookingStatus === 'idle' || bookingStatus === 'reserving' ? (
              <button
                className="btn btn-primary"
                onClick={handleReserve}
                disabled={selectedSeats.length === 0 || bookingStatus === 'reserving'}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                <Lock size={16} /> {bookingStatus === 'reserving' ? 'Holding Seats...' : 'Reserve Seats (10m)'}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '1rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmBooking}
                  disabled={bookingStatus === 'booking' || timeLeft <= 0}
                  style={{ width: '100%', background: 'linear-gradient(135deg, var(--color-success), rgba(0, 255, 135, 0.8))' }}
                >
                  <CheckCircle size={16} /> {bookingStatus === 'booking' ? 'Booking...' : 'Confirm & Book Tickets'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelReservation}
                  disabled={bookingStatus === 'booking'}
                  style={{ width: '100%' }}
                >
                  Cancel Hold
                </button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              <ShieldAlert size={12} />
              <span>Payments are processed securely. Tickets are non-refundable after booking confirmation.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
