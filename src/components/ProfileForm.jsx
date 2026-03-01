'use client';
import React, { useState } from 'react';
import { signup, login, resendVerification } from '@/lib/api';

function ProfileForm({ onProfileCreated }) {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const data = await signup({
        email,
        password,
        name,
        age: parseInt(age),
        location
      });

      if (data?.requiresEmailVerification) {
        setNeedsVerification(true);
        setIsLogin(true);
        setInfo(
          data?.emailSent
            ? 'Signup complete. Check your inbox and verify your email before login.'
            : 'Signup complete, but verification email could not be sent. Use resend below.'
        );
        setLoading(false);
        return;
      }

      onProfileCreated(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create profile');
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const data = await login(email, password);
      onProfileCreated(data.user);
    } catch (err) {
      const responseData = err.response?.data || {};
      if (err.response?.status === 403 && responseData.requiresEmailVerification) {
        setNeedsVerification(true);
        setInfo('Verify your email first. If needed, resend the verification email.');
      } else {
        setError(responseData.error || 'Login failed');
      }
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Enter your email to resend verification.');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    try {
      await resendVerification(email);
      setInfo('Verification email sent. Check your inbox and spam folder.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-form-container">
      <div className="profile-form-card">
        <h2>{isLogin ? 'Login' : 'Create Your Profile'}</h2>
        
        {error && <div className="error-message">{error}</div>}
        {info && <div className="encounter-status">{info}</div>}

        <form onSubmit={isLogin ? handleLogin : handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength="6"
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your name"
                />
              </div>

              <div className="form-group">
                <label>Age *</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                  min="18"
                  max="100"
                  placeholder="25"
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="New York, NY"
                />
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Profile'}
          </button>
        </form>

        <button 
          className="toggle-auth-btn"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
        </button>

        {needsVerification && (
          <button
            type="button"
            className="toggle-auth-btn"
            onClick={handleResendVerification}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Resend verification email'}
          </button>
        )}
      </div>
    </div>
  );
}

export default ProfileForm;
