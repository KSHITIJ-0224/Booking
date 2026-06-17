import React from 'react';
import { Calendar, MapPin, Ticket } from 'lucide-react';

export default function EventCard({ event, onSelect }) {
  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <div className="event-card glass-panel">
      {event.image ? (
        <img src={event.image} alt={event.name} className="event-card-img" />
      ) : (
        <div className="event-card-img" style={{ background: 'linear-gradient(135deg, #1b2030, #0d0f17)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ticket size={48} color="rgba(255,255,255,0.15)" />
        </div>
      )}
      <div className="event-card-info">
        <div className="event-card-date">
          <Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline' }} />
          {formatDate(event.date)}
        </div>
        <h3 className="event-card-title title-display">{event.name}</h3>
        <p className="event-card-desc">{event.description}</p>
        
        <div className="event-card-meta">
          <div className="event-card-venue" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <MapPin size={14} color="var(--color-primary)" />
            {event.venue}
          </div>
          <div className="event-card-price">
            ${event.price}<span>/seat</span>
          </div>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={() => onSelect(event._id)}
          style={{ marginTop: '1.25rem', width: '100%' }}
        >
          Book Seats
        </button>
      </div>
    </div>
  );
}
