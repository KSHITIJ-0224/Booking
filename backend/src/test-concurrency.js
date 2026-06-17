const axios = require('axios');
const mongoose = require('mongoose');
const Event = require('./models/Event');
const Seat = require('./models/Seat');
const User = require('./models/User');

const API_URL = 'http://localhost:5000/api';

const runTest = async () => {
  console.log('--- Starting Concurrency Test ---');
  
  try {
    // 1. Fetch first event from the DB to target
    await mongoose.connect('mongodb://127.0.0.1:27017/task2');
    const targetEvent = await Event.findOne({});
    if (!targetEvent) {
      console.error('Error: No events found in DB. Make sure you seeded the DB first using: node src/seed.js');
      process.exit(1);
    }
    
    const eventId = targetEvent._id.toString();
    const targetSeat = 'A5'; // Target seat for concurrency fight
    console.log(`Target Event: "${targetEvent.name}" (${eventId})`);
    console.log(`Target Seat: "${targetSeat}"`);

    // Reset targeted seat to available
    await Seat.updateOne(
      { eventId, seatNumber: targetSeat },
      { $set: { status: 'available', reservedBy: null, expiresAt: null } }
    );
    console.log(`Seat "${targetSeat}" reset to 'available' in DB.`);
    await mongoose.connection.close();

    // 2. Register two test users
    console.log('\nRegistering User A and User B...');
    let userAToken, userBToken;

    try {
      const regA = await axios.post(`${API_URL}/auth/register`, {
        name: 'User A',
        email: `usera_${Date.now()}@test.com`,
        password: 'password123'
      });
      userAToken = regA.data.token;
      console.log('User A registered.');
    } catch (e) {
      // If already exists, login
      const logA = await axios.post(`${API_URL}/auth/login`, {
        email: 'usera@test.com',
        password: 'password123'
      });
      userAToken = logA.data.token;
      console.log('User A logged in.');
    }

    try {
      const regB = await axios.post(`${API_URL}/auth/register`, {
        name: 'User B',
        email: `userb_${Date.now()}@test.com`,
        password: 'password123'
      });
      userBToken = regB.data.token;
      console.log('User B registered.');
    } catch (e) {
      const logB = await axios.post(`${API_URL}/auth/login`, {
        email: 'userb@test.com',
        password: 'password123'
      });
      userBToken = logB.data.token;
      console.log('User B logged in.');
    }

    // 3. Prepare concurrent reservation requests
    console.log(`\nLaunching simultaneous requests for seat "${targetSeat}"...`);
    
    const reqA = axios.post(
      `${API_URL}/reserve`,
      { eventId, seatNumbers: [targetSeat] },
      { headers: { Authorization: `Bearer ${userAToken}` } }
    );

    const reqB = axios.post(
      `${API_URL}/reserve`,
      { eventId, seatNumbers: [targetSeat] },
      { headers: { Authorization: `Bearer ${userBToken}` } }
    );

    // Run simultaneously
    const results = await Promise.allSettled([reqA, reqB]);

    const userAResult = results[0];
    const userBResult = results[1];

    console.log('\n--- Results ---');
    
    if (userAResult.status === 'fulfilled') {
      console.log(`User A: SUCCESS (Status ${userAResult.value.status}) - Reserved successfully!`);
    } else {
      console.log(`User A: FAILED (Status ${userAResult.reason.response?.status}) - ${userAResult.reason.response?.data?.message}`);
    }

    if (userBResult.status === 'fulfilled') {
      console.log(`User B: SUCCESS (Status ${userBResult.value.status}) - Reserved successfully!`);
    } else {
      console.log(`User B: FAILED (Status ${userBResult.reason.response?.status}) - ${userBResult.reason.response?.data?.message}`);
    }

    // Check assertions
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;

    console.log('\n--- Conclusion ---');
    if (successCount === 1 && failedCount === 1) {
      console.log('PASS: Exactly one user succeeded in reserving the seat, and the other was rejected with conflict!');
    } else {
      console.error(`FAIL: Concurrency failure! Successes: ${successCount}, Failures: ${failedCount}`);
    }

  } catch (error) {
    console.error('Test Execution Error:', error.message);
  }
};

runTest();
