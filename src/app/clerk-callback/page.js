'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { setToken } from '@/lib/api';

export default function ClerkCallbackPage() {
  const router = useRouter();
  const { isLoaded, getToken } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoaded) return () => {};
    let active = true;
    (async () => {
      try {
        const clerkToken = await getToken();
        const res = await fetch('/api/auth/clerk', {
          method: 'POST',
          headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : undefined,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Authentication failed');
        if (data?.token) setToken(data.token);
        if (active) router.replace('/encounter');
      } catch (err) {
        if (active) setError(err?.message || 'Authentication failed');
      }
    })();
    return () => {
      active = false;
    };
  }, [router, isLoaded, getToken]);

  return (
    <div className="loading" style={{ padding: '32px', textAlign: 'center' }}>
      {error || 'Finishing sign-in...'}
    </div>
  );
}
