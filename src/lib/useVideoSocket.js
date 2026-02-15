'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '@/lib/api';

const getSocketUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

/**
 * Connect to /video namespace with JWT. Emits join on connect.
 * Returns { socket, connected }.
 */
export function useVideoSocket() {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const url = getSocketUrl();
    const s = io(`${url}/video`, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setConnected(true);
      setSocket(s);
    });
    s.on('disconnect', () => {
      setConnected(false);
      setSocket(null);
    });
    s.on('connect_error', () => {
      setConnected(false);
      setSocket(null);
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, []);

  return { socket, connected };
}
