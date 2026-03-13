'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setToken } from '@/lib/api';

export default function ClerkCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/clerk', { method: 'POST' });
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
  }, [router]);

  return (
    <div className="loading" style={{ padding: '32px', textAlign: 'center' }}>
      {error || 'Finishing sign-in...'}
    </div>
  );
}
