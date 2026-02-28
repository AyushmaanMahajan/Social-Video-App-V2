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
export function useVideoSocket(enabled = true) {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const token = enabled ? getToken() : null;

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      setSocket(null);
      return;
    }

    if (!token) {
      console.warn('[video:socket_handshake:fail] Missing JWT token for socket auth');
      setConnected(false);
      setSocket(null);
      return;
    }

    const url = getSocketUrl();
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      console.error('[video:https:fail] Video calls require HTTPS outside localhost');
    }
    const s = io(`${url}/video`, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 800,
    });
    setSocket(s);

    s.on('connect', () => {
      console.info('[video:socket_handshake:ok] Socket connected', { socketId: s.id });
      s.emit('client-diagnostic', {
        stage: 'socket_handshake',
        status: 'ok',
        message: 'Client socket connected',
        meta: { socketId: s.id },
      });
      setConnected(true);
    });
    s.on('disconnect', (reason) => {
      console.warn('[video:socket_handshake:fail] Socket disconnected', { reason });
      setConnected(false);
    });
    s.on('connect_error', (error) => {
      console.error('[video:socket_handshake:fail] Socket connection error', { message: error?.message });
      setConnected(false);
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [token, enabled]);

  return { socket, connected };
}
