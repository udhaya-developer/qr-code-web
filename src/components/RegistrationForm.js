'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RegistrationForm({ onRegistered }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    referredBy: '',
    squad: '',
  });

  const squads = ['Solo', 'Seed', 'Start', 'E2E', 'KL', 'Success'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Something went wrong');
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f0c324', '#ffffff', '#ffd700']
      });

      onRegistered(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
    >
      <form onSubmit={handleSubmit} className="nx-form-grid">
        <div className="form-group nx-half">
          <label>Full Name</label>
          <input
            required
            type="text"
            name="fullName"
            placeholder="John Doe"
            value={formData.fullName}
            onChange={handleChange}
          />
        </div>

        <div className="form-group nx-half">
          <label>Email Address</label>
          <input
            required
            type="email"
            name="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="form-group nx-half">
          <label>Phone Number</label>
          <input
            required
            type="tel"
            name="phone"
            placeholder="+1 234 567 890"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div className="form-group nx-half">
          <label>Squad / Category</label>
          <select 
            required 
            name="squad" 
            value={formData.squad} 
            onChange={handleChange}
          >
            <option value="">Select your squad</option>
            {squads.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="form-group nx-full">
          <label>Referred By (Optional)</label>
          <input
            type="text"
            name="referredBy"
            placeholder="Name of person or organization"
            value={formData.referredBy}
            onChange={handleChange}
          />
        </div>

        {error && <p className="nx-form-error">{error}</p>}

        <button 
          type="submit" 
          className="submit-btn nx-full" 
          disabled={loading}
        >
          {loading ? <Loader2 className="nx-spin" /> : 'Register Now'}
        </button>
        <p className="nx-form-note nx-full">By initiating you agree to protocol terms and sovereign data clearance.</p>
      </form>
    </motion.div>
  );
}
