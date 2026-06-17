const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Event = require('./models/Event');
const Seat = require('./models/Seat');
const Reservation = require('./models/Reservation');

dotenv.config();

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

const seedDB = async () => {
  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for seeding...');

    // Clear existing collections
    await Event.deleteMany({});
    await Seat.deleteMany({});
    await Reservation.deleteMany({});
    console.log('Cleared existing Events, Seats, and Reservations.');

    // Seed Events
    const createdEvents = await Event.insertMany(eventsData);
    console.log(`Successfully seeded ${createdEvents.length} events.`);

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
      console.log(`Generated ${seatList.length} seats for event "${event.name}".`);
    }

    console.log(`Seeding complete. Seeded ${totalSeatsSeeded} total seats.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();
