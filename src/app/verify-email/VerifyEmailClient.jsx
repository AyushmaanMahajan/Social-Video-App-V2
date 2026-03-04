'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyEmail } from '@/lib/api';

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Verifying your email...');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Verification link is invalid.');
      setStatus('');
      return;
    }

    let mounted = true;
    verifyEmail(token)
      .then(() => {
        if (!mounted) return;
        setStatus('Email verified. Redirecting to onboarding...');
        setTimeout(() => router.replace('/encounter'), 1000);
      })
      .catch((err) => {
        if (!mounted) return;
        setStatus('');
        setError(err.response?.data?.error || 'Verification failed');
      });

    return () => {
      mounted = false;
    };
  }, [searchParams, router]);

  return (
    <div className="encounter-shell">
      <div className="profile-form-card">
        <h2>Email Verification</h2>
        {status && <p>{status}</p>}
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}
