# AWARDSpass - Premium Event Seat Booking System

A simplified event ticket booking application featuring real-time seat reservation, atomic double-booking prevention, user authentication, and a high-end, responsive dark-mode Awwwards-style UI.

---

## Technical Architecture

The application is structured into two main components:
1. **Backend (`/backend`)**: Node.js + Express.js API server using MongoDB (via Mongoose) to track events, seats, and reservations.
2. **Frontend (`/frontend`)**: React.js client bootstrapped with Vite using pure Vanilla CSS for a custom, responsive, glow-themed design.

---

## Core Features

- **Event Catalog**: Browse curated live events (music festivals, symphony orchestras, tech summits).
- **Interactive Seat Map**: Live responsive layout showing available, reserved, selected, and booked statuses.
- **Atomic Holds**: Reserve multiple seats temporarily (10-minute hold) with a synchronized countdown timer.
- **Secure Checkouts**: Confirm reservations to finalize booking.
- **JWT Authentication**: User registration and login required for seat holds and bookings.
- **Real-Time Error Handling**: Instant warning toasts when conflicts (e.g., seat taken or reservation expired) occur.

---

## Database Schema (MongoDB)

1. **User**: Stores username, email, and encrypted passwords (using `bcryptjs`).
2. **Event**: Stores basic metadata (name, date/time, venue, total seats, price, image).
3. **Seat**: Associated with a specific event. Tracks seat state (`['available', 'reserved', 'booked']`), owner user ID, and expiration dates.
   - *Index*: Compound unique index `{ eventId: 1, seatNumber: 1 }` prevents duplicate seat allocation.
4. **Reservation**: Links a user to their reserved seats. Uses a MongoDB TTL Index (`expireAfterSeconds: 0`) to clean up records automatically at the `expiresAt` timestamp.

---

## Crucial Design Decision: Double Booking Prevention

### The Problem
If two users view the same seat layout and click "Reserve" at the exact same millisecond, standard application checks (like querying if the seat is available first and then updating it in two separate database calls) lead to **race conditions** and double booking.

### The Solution: Atomic Operations with Conditional Rollbacks
Rather than requiring a complex MongoDB Replica Set configuration for transactions (which limits ease-of-running locally), we prevent race conditions by utilizing **atomic queries** at the document level:

1. **Atomic Update**: We perform an `updateMany` operation matching seats by `eventId` and `seatNumber` **only if** their status is `'available'` OR their reservation has `'expired'`:
   ```javascript
   const result = await Seat.updateMany(
     {
       eventId,
       seatNumber: { $in: seatNumbers },
       $or: [
         { status: 'available' },
         { status: 'reserved', expiresAt: { $lt: new Date() } }
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
   ```
2. **Safety Check**: MongoDB guarantees that `updateMany` executes atomically at the document level. If another user successfully modified one of the seats in our request, the number of records modified (`result.modifiedCount`) will be **less** than the number of seats requested (`seatNumbers.length`).
3. **Rollback**: If the count doesn't match:
   - We roll back the seats we *did* successfully modify to release them:
     ```javascript
     await Seat.updateMany(
       { eventId, seatNumber: { $in: seatNumbers }, status: 'reserved', reservedBy: req.user._id, expiresAt },
       { $set: { status: 'available', reservedBy: null, expiresAt: null } }
     );
     ```
   - We query the database to identify which specific seats are already taken and return a `409 Conflict` error with a list of the conflicting seats.
4. **Expiration Enforcement**: When confirming a booking (`/api/bookings`), we verify the reservation timestamp is not expired:
   - If `expiresAt <= Date.now()`, we release the seats, delete the reservation, and return an error.
   - If valid, we atomically transition the status to `'booked'`.

---

## Setup & Running the Application

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) installed locally or a MongoDB Atlas URI.

---

### Backend Setup

1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/task2
   JWT_SECRET=super_secret_booking_key_2026_xYz
   ```
4. Seed the database with initial events and seat layouts:
   ```bash
   node src/seed.js
   ```
5. Start the API server in development mode:
   ```bash
   npm run dev
   ```
   The backend will be running on `http://localhost:5000`.

---

### Frontend Setup

1. Open a separate terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## Verification & Testing

### Running the Concurrency Test
We have provided an automated test script to simulate concurrent requests for the same seat.
With the backend running, run the following in the backend folder:
```bash
node src/test-concurrency.js
```
This script will register two test users, attempt to reserve the exact same seat (`A5`) concurrently, and verify that only one succeeds while the other is rejected with a `409 Conflict` error.
