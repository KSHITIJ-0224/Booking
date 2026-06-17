import React from 'react';
import EventCard from './EventCard';
import { Sparkles, CalendarOff } from 'lucide-react';

export default function EventList({ events, onSelectEvent, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid rgba(0, 240, 255, 0.1)', borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite', marginBottom: '1.5rem' }}></div>
        <p style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Retrieving live event catalog...</p>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="empty-state glass-panel">
        <CalendarOff size={48} />
        <h3 className="title-display" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Events Found</h3>
        <p>There are currently no active events scheduled. Please check back later.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title title-display">
        <span>Curated Experiences</span>
        FEATURED EVENTS
      </h2>
      <div className="event-grid">
        {events.map((event) => (
          <EventCard key={event._id} event={event} onSelect={onSelectEvent} />
        ))}
      </div>
    </div>
  );
}
