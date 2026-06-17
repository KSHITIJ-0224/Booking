import React, { useRef } from 'react';
import { Calendar, MapPin, Film, CheckCircle2, User, Printer } from 'lucide-react';

export default function TicketPass({ booking, event, user, onReset }) {
  const ticketRef = useRef(null);

  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString('en-US', options);
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate a mock ticket ID
  const ticketId = `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div className="ticket-container" ref={ticketRef}>
        <div className="ticket-pass">
          <div className="ticket-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Film size={20} color="var(--color-primary)" />
              <span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem' }}>AWARDS PASS</span>
            </div>
            <div className="ticket-tag">
              <CheckCircle2 size={12} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline' }} />
              CONFIRMED
            </div>
          </div>

          <div className="ticket-body">
            <h3 className="ticket-title title-display">{event.name}</h3>

            <div className="ticket-info-grid" style={{ marginTop: '1rem' }}>
              <div>
                <div className="ticket-info-label">Date</div>
                <div className="ticket-info-value">{formatDate(event.date)}</div>
              </div>
              <div>
                <div className="ticket-info-label">Time</div>
                <div className="ticket-info-value">{formatTime(event.date)}</div>
              </div>
            </div>

            <div className="ticket-info-grid">
              <div>
                <div className="ticket-info-label">Venue</div>
                <div className="ticket-info-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} color="var(--color-primary)" />
                  {event.venue}
                </div>
              </div>
              <div>
                <div className="ticket-info-label">Attendee</div>
                <div className="ticket-info-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={12} color="var(--color-success)" />
                  {user ? user.name : 'Guest'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <div className="ticket-info-label">Seats Reserved</div>
              <div className="ticket-info-value" style={{ fontSize: '1.25rem', color: 'var(--color-success)', letterSpacing: '0.05em' }}>
                {booking.seatNumbers.join(', ')}
              </div>
            </div>
          </div>

          <div className="ticket-footer">
            <div className="ticket-barcode"></div>
            <div className="ticket-id">{ticketId}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <button className="btn btn-secondary" onClick={handlePrint}>
          <Printer size={16} /> Print Ticket
        </button>
        <button className="btn btn-primary" onClick={onReset}>
          Book Another Event
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .ticket-container, .ticket-container * {
            visibility: visible;
          }
          .ticket-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex;
            justify-content: center;
          }
          .ticket-pass {
            box-shadow: none;
            border: 1px solid #000;
            background: #fff;
            color: #000;
          }
          .ticket-info-value, .ticket-title, .ticket-barcode {
            color: #000 !important;
          }
          .ticket-tag {
            border-color: #000;
            color: #000;
            background: #eee;
          }
        }
      `}} />
    </div>
  );
}
