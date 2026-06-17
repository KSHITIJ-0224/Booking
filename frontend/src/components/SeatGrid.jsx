import React from 'react';

export default function SeatGrid({ seats, selectedSeats, onSelectSeat }) {
  // Group seats by row character (e.g. 'A', 'B', etc.)
  const groupedSeats = seats.reduce((acc, seat) => {
    const row = seat.seatNumber.charAt(0);
    if (!acc[row]) {
      acc[row] = [];
    }
    acc[row].push(seat);
    return acc;
  }, {});

  const getSeatClass = (seat) => {
    if (seat.status === 'booked') return 'seat-booked';
    if (seat.status === 'reserved') return 'seat-reserved';
    if (selectedSeats.includes(seat.seatNumber)) return 'seat-selected';
    return 'seat-available';
  };

  const handleSeatClick = (seat) => {
    if (seat.status !== 'available') return;
    onSelectSeat(seat.seatNumber);
  };

  return (
    <div className="seat-map-wrapper glass-panel">
      {/* Visual Screen Arc */}
      <div className="screen-arc"></div>

      {/* Seat Layout */}
      <div className="seat-grid-container">
        {Object.entries(groupedSeats).sort(([a], [b]) => a.localeCompare(b)).map(([rowLabel, rowSeats]) => (
          <div key={rowLabel} className="seat-row">
            <div className="row-label">{rowLabel}</div>
            {rowSeats.sort((a, b) => {
              const numA = parseInt(a.seatNumber.slice(1), 10);
              const numB = parseInt(b.seatNumber.slice(1), 10);
              return numA - numB;
            }).map((seat) => (
              <button
                key={seat._id}
                className={`seat ${getSeatClass(seat)}`}
                onClick={() => handleSeatClick(seat)}
                disabled={seat.status !== 'available'}
                title={`Seat ${seat.seatNumber} - ${seat.status}`}
              >
                {seat.seatNumber}
              </button>
            ))}
            <div className="row-label">{rowLabel}</div>
          </div>
        ))}
      </div>

      {/* Color Coding Legend */}
      <div className="seat-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ border: '1px solid rgba(255, 255, 255, 0.12)', background: 'rgba(255, 255, 255, 0.03)' }}></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: 'var(--color-success)', boxShadow: '0 0 6px var(--color-success)' }}></div>
          <span>Selected</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ border: '1px solid var(--color-warning)', background: 'rgba(255, 179, 0, 0.08)' }}></div>
          <span>Temporarily Reserved</span>
        </div>
        <div className="legend-item" style={{ textDecoration: 'line-through' }}>
          <div className="legend-color" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '1px', background: 'var(--text-muted)', transform: 'rotate(45deg)' }}></div>
          </div>
          <span>Booked</span>
        </div>
      </div>
    </div>
  );
}
