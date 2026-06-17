const API_URL = 'http://localhost:5000/api';

// Helper to get headers with JWT token if it exists
const getHeaders = (isJson = true) => {
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Generic response handler
const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

export const authAPI = {
  register: async (name, email, password) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await handleResponse(res);
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ name: data.name, email: data.email, id: data._id }));
    }
    return data;
  },

  login: async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ name: data.name, email: data.email, id: data._id }));
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: getHeaders(),
      });
      return await handleResponse(res);
    } catch (err) {
      // If token is invalid/expired, remove it
      if (err.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      throw err;
    }
  },
};

export const eventAPI = {
  getEvents: async () => {
    const res = await fetch(`${API_URL}/events`);
    return await handleResponse(res);
  },

  getEventDetails: async (eventId) => {
    const res = await fetch(`${API_URL}/events/${eventId}`);
    return await handleResponse(res);
  },
};

export const bookingAPI = {
  reserveSeats: async (eventId, seatNumbers) => {
    const res = await fetch(`${API_URL}/reserve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ eventId, seatNumbers }),
    });
    return await handleResponse(res);
  },

  confirmBooking: async (reservationId) => {
    const res = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reservationId }),
    });
    return await handleResponse(res);
  },
};
