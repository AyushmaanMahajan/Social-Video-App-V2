'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signup, login, resendVerification } from '@/lib/api';

function detectInitialLoginMode() {
  if (typeof window === 'undefined') return false;
  const authMode = String(new URLSearchParams(window.location.search).get('auth') || '').toLowerCase();
  return authMode === 'login';
}

function ProfileForm({ onProfileCreated }) {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(detectInitialLoginMode);
  const [username, setUsername] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [devVerificationUrl, setDevVerificationUrl] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  const setAuthMode = (nextIsLogin) => {
    setIsLogin(nextIsLogin);
    setNeedsVerification(false);
    setAwaitingVerification(false);
    setError('');
    setInfo('');
    setDevVerificationUrl('');
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('auth', nextIsLogin ? 'login' : 'signup');
      router.replace(`/encounter?${params.toString()}`);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const authMode = String(new URLSearchParams(window.location.search).get('auth') || '').toLowerCase();
    if (authMode === 'login') setIsLogin(true);
    if (authMode === 'signup') setIsLogin(false);
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setNeedsVerification(false);
    setAwaitingVerification(false);
    setLoading(true);
    setError('');
    setInfo('');
    setDevVerificationUrl('');

    try {
      const data = await signup({ username, email, password });
      if (data?.requiresEmailVerification) {
        setNeedsVerification(true);
        setAwaitingVerification(true);
        if (data?.devVerificationUrl) {
          setDevVerificationUrl(data.devVerificationUrl);
        }
        setInfo(
          data?.emailSent
            ? 'Account created. Verify your email from your inbox, then onboarding will continue.'
            : data?.verificationError || 'Account created, but the verification email could not be sent. Use resend below.'
        );
        return;
      }
      onProfileCreated(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAwaitingVerification(false);
    setLoading(true);
    setError('');
    setInfo('');
    setDevVerificationUrl('');

    try {
      const data = await login(identifier, password);
      onProfileCreated(data.user);
    } catch (err) {
      const responseData = err.response?.data || {};
      if (err.response?.status === 403 && responseData.requiresEmailVerification) {
        setNeedsVerification(true);
        if (responseData.email) setEmail(responseData.email);
        setInfo('Verify your email first. You can resend the verification link below.');
      } else {
        setError(responseData.error || 'Login failed');
      }
    } finally {
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
    setDevVerificationUrl('');
    try {
      const data = await resendVerification(email);
      if (data?.emailSent === false) {
        setInfo(data?.error || 'Verification email could not be sent right now.');
      } else {
        setInfo('Verification email sent. Check your inbox and spam folder.');
      }
      if (data?.devVerificationUrl) {
        setDevVerificationUrl(data.devVerificationUrl);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-form-container">
      <div className="profile-form-card">
        <div className="profile-auth-head">
          <h2>{isLogin ? 'Sign in' : 'Create account'}</h2>
          <button
            type="button"
            className="auth-switch-top"
            onClick={() => setAuthMode(!isLogin)}
            disabled={loading}
          >
            {isLogin ? 'Create account' : 'Sign in'}
          </button>
        </div>

        {!isLogin && (
          <p className="muted onboarding-inline-note">
            Create your account first. After email verification, onboarding continues with birthdate and safety steps.
          </p>
        )}

        {error && <div className="error-message">{error}</div>}
        {info && <div className="encounter-status">{info}</div>}
        {devVerificationUrl && (
          <div className="encounter-status">
            Development verification link:{' '}
            <a href={devVerificationUrl} target="_blank" rel="noreferrer">
              Open verification
            </a>
          </div>
        )}

        <form onSubmit={isLogin ? handleLogin : handleSignup} className="profile-form">
          {isLogin ? (
            <div className="form-group">
              <label>Username *</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
                placeholder="your_username"
              />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading || awaitingVerification}
                  autoComplete="username"
                  placeholder="your_username"
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || awaitingVerification}
                  autoComplete="email"
                  placeholder="your@email.com"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || (!isLogin && awaitingVerification)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder={isLogin ? 'Enter your password' : 'At least 8 characters'}
              minLength="8"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || (!isLogin && awaitingVerification)}
          >
            {loading
              ? 'Please wait...'
              : !isLogin && awaitingVerification
                ? 'Verify your email to continue'
                : isLogin
                  ? 'Sign in'
                  : 'Create account'}
          </button>
        </form>

        {!isLogin && (
          <button
            type="button"
            className="toggle-auth-btn"
            onClick={() => setAuthMode(true)}
            disabled={loading}
          >
            {awaitingVerification ? 'Already verified? Sign in' : 'Already have an account? Sign in'}
          </button>
        )}

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
