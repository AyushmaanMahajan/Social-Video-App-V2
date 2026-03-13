'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signup, login, resendVerification } from '@/lib/api';
import { useAuth, useSignIn } from '@clerk/nextjs';

function detectInitialLoginMode() {
  if (typeof window === 'undefined') return false;
  const authMode = String(new URLSearchParams(window.location.search).get('auth') || '').toLowerCase();
  return authMode === 'login';
}

function ProfileForm({ onProfileCreated }) {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(false);
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
  const { isLoaded: clerkLoaded, signIn } = useSignIn();
  const { isSignedIn } = useAuth();

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

  const startSso = async (strategy) => {
    if (!clerkLoaded || !signIn) return;
    setError('');
    setInfo('');
    try {
      if (isSignedIn) {
        router.replace('/clerk-callback');
        return;
      }
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/clerk-sso-callback',
        redirectUrlComplete: '/clerk-callback',
      });
    } catch (err) {
      const message = err?.errors?.[0]?.message || err?.message || 'SSO failed. Please try again.';
      setError(message);
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

        <div className="sso-buttons">
          <button
            type="button"
            className="sso-btn"
            onClick={() => startSso('oauth_google')}
            disabled={!clerkLoaded || loading}
          >
            <span className="sso-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48" width="20" height="20" focusable="false">
                <path
                  fill="#FFC107"
                  d="M43.6 20.5H42V20H24v8h11.3C33.6 32.9 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.3 14.7 12.9 19.6C14.7 15.3 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6 29.3 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.1 0 9.9-2 13.5-5.2l-6.2-5.2c-1.9 1.3-4.3 2.1-7.3 2.1-5.2 0-9.5-3.1-11.1-7.5l-6.8 5.2C9.3 39.9 16.1 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.5 5.5-6.7 6.9l.1.1 6.2 5.2C36.9 38.3 44 34 44 24c0-1.3-.1-2.7-.4-3.5z"
                />
              </svg>
            </span>
            Continue with Google
          </button>
          <button
            type="button"
            className="sso-btn"
            onClick={() => startSso('oauth_apple')}
            disabled={!clerkLoaded || loading}
          >
            <span className="sso-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
                <path
                  fill="currentColor"
                  d="M16.36 1.5c0 1.14-.46 2.27-1.24 3.06-.83.84-2.1 1.48-3.26 1.39-.15-1.11.4-2.24 1.2-3.06.84-.88 2.25-1.53 3.3-1.39zM20.45 17.2c-.25.58-.55 1.13-.9 1.66-.47.72-1.07 1.62-1.97 1.64-.78.02-.98-.5-2.04-.5-1.06 0-1.28.48-2.02.52-.9.03-1.59-.86-2.06-1.57-1.29-1.88-2.27-5.3-1-7.62.62-1.14 1.73-1.86 2.94-1.88.92-.02 1.78.62 2.35.62.57 0 1.64-.76 2.76-.65.47.02 1.79.19 2.64 1.45-.07.04-1.58.93-1.56 2.77.02 2.2 1.93 2.93 1.95 2.94-.01.05-.31 1.05-1.09 2.62z"
                />
              </svg>
            </span>
            Continue with Apple
          </button>
          <button
            type="button"
            className="sso-btn"
            onClick={() => startSso('oauth_microsoft')}
            disabled={!clerkLoaded || loading}
          >
            <span className="sso-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
                <path fill="#F25022" d="M2 3h9v9H2z" />
                <path fill="#7FBA00" d="M13 3h9v9h-9z" />
                <path fill="#00A4EF" d="M2 14h9v9H2z" />
                <path fill="#FFB900" d="M13 14h9v9h-9z" />
              </svg>
            </span>
            Continue with Outlook
          </button>
        </div>
        <div className="sso-divider">
          <span>or</span>
        </div>

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
