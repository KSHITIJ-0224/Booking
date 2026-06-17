import React, { useState } from 'react';
import { X, LogIn, UserPlus } from 'lucide-react';
import { authAPI } from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, addToast }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      addToast({
        title: 'Validation Error',
        message: 'Please fill in all required fields.',
        type: 'error',
      });
      return;
    }

    if (password.length < 6) {
      addToast({
        title: 'Validation Error',
        message: 'Password must be at least 6 characters.',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      let data;
      if (isLogin) {
        data = await authAPI.login(email, password);
        addToast({
          title: 'Welcome Back!',
          message: `Logged in successfully as ${data.name}.`,
          type: 'success',
        });
      } else {
        data = await authAPI.register(name, email, password);
        addToast({
          title: 'Account Created',
          message: 'Your account has been registered successfully.',
          type: 'success',
        });
      }
      onAuthSuccess({ name: data.name, email: data.email, id: data._id });
      onClose();
    } catch (err) {
      console.error(err);
      addToast({
        title: isLogin ? 'Login Failed' : 'Registration Failed',
        message: err.message || 'An error occurred during authentication.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <h2 className="modal-title">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="modal-subtitle">
          {isLogin ? 'Access your event bookings & tickets' : 'Join us to reserve and book event tickets'}
        </p>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? (
              'Processing...'
            ) : isLogin ? (
              <>
                <LogIn size={18} /> Sign In
              </>
            ) : (
              <>
                <UserPlus size={18} /> Sign Up
              </>
            )}
          </button>
        </form>

        <div className="form-toggle">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register now' : 'Sign In instead'}
          </button>
        </div>
      </div>
    </div>
  );
}
