import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Ticket, User, Search, Sparkles } from 'lucide-react';
import { authAPI, eventAPI } from './api';
import EventList from './components/EventList';
import BookingFlow from './components/BookingFlow';
import AuthModal from './components/AuthModal';
import Toast from './components/Toast';
import './styles/global.css';
import './styles/components.css';

export default function App() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage and fetch events on mount
  useEffect(() => {
    const initApp = async () => {
      // 1. Get saved user session
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (savedUser && token) {
        setUser(JSON.parse(savedUser));
        // Verify token with backend
        try {
          const verifiedUser = await authAPI.getCurrentUser();
          setUser(verifiedUser);
        } catch (err) {
          console.error('Session expired, logging out', err);
          authAPI.logout();
          setUser(null);
          addToast({
            title: 'Session Expired',
            message: 'Your login session has expired. Please sign in again.',
            type: 'warning',
          });
        }
      }

      // 2. Fetch events
      try {
        const eventsData = await eventAPI.getEvents();
        setEvents(eventsData);
        setFilteredEvents(eventsData);
      } catch (err) {
        console.error('Failed to load events:', err);
        addToast({
          title: 'Connection Error',
          message: 'Failed to retrieve event list from server.',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  // Filter events by name or venue
  useEffect(() => {
    if (!searchTerm) {
      setFilteredEvents(events);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = events.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          e.venue.toLowerCase().includes(term)
      );
      setFilteredEvents(filtered);
    }
  }, [searchTerm, events]);

  // Toast Helpers
  const addToast = (toast) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLogout = () => {
    authAPI.logout();
    setUser(null);
    setSelectedEventId(null); // Return to list view
    addToast({
      title: 'Logged Out',
      message: 'You have been logged out successfully.',
      type: 'success',
    });
  };

  return (
    <div>
      {/* Navigation Header */}
      <header className="app-header">
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => setSelectedEventId(null)}>
          <Ticket size={24} color="#00f0ff" />
          <span>AWARDS<span style={{ color: 'var(--text-primary)', fontStyle: 'italic', fontWeight: '300' }}>pass</span></span>
        </div>

        {/* Search Bar - only visible when not booking */}
        {!selectedEventId && (
          <div style={{ position: 'relative', maxWidth: '400px', width: '100%', margin: '0 1rem', display: 'none' /* hidden for mobile layout by default, styled below */ }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search events or venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.25rem', borderRadius: '30px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>
        )}

        <div className="auth-nav">
          {user ? (
            <>
              <div className="user-badge">
                <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                  {user.name.split(' ')[0]}
                </span>
              </div>
              <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                <LogOut size={14} /> Log Out
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setAuthModalOpen(true)} style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
              <LogIn size={14} /> Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content">
        {!selectedEventId ? (
          <div>
            {/* Search banner */}
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center', background: 'radial-gradient(circle at top right, rgba(0, 240, 255, 0.04), transparent), var(--bg-glass)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600 }}>
                <Sparkles size={14} /> Premium Reservation System
              </div>
              <h1 className="title-display" style={{ fontSize: '2.5rem', lineHeight: '1.2', background: 'linear-gradient(135deg, white 60%, var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                SECURE YOUR ACCESS TO WORLD-CLASS EVENTS
              </h1>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', fontSize: '1rem' }}>
                Select a featured event below to experience our interactive seat grid with real-time locks and atomic booking protection.
              </p>
              
              {/* Search Bar Input */}
              <div style={{ position: 'relative', maxWidth: '460px', width: '100%', marginTop: '1rem' }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search events, venues or cities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: '40px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '0.95rem', outline: 'none', transition: 'var(--transition-fast)' }}
                  className="search-input"
                />
              </div>
            </div>

            <EventList
              events={filteredEvents}
              onSelectEvent={(id) => setSelectedEventId(id)}
              loading={loading}
            />
          </div>
        ) : (
          <BookingFlow
            eventId={selectedEventId}
            onBack={() => setSelectedEventId(null)}
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            addToast={addToast}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(userData) => setUser(userData)}
        addToast={addToast}
      />

      {/* Floating Notifications */}
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <style dangerouslySetInnerHTML={{ __html: `
        .search-input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 15px var(--color-primary-glow);
          background: rgba(255, 255, 255, 0.05);
        }
      `}} />
    </div>
  );
}
