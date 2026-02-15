/**
 * ICE configuration for WebRTC.
 * Phase 1: STUN only (Google).
 * Phase 2: Add TURN from env (TURN_URL, TURN_USERNAME, TURN_PASSWORD) in production.
 */
const GOOGLE_STUN = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export function getIceServers() {
  // Phase 2: STUN only in dev; STUN + TURN in production (TURN_URL, TURN_USERNAME, TURN_PASSWORD in .env)
  // Phase 2: reconnect logic + connection state UI (connecting | connected | reconnecting | failed)
  // Phase 2: bandwidth adaptation (lower resolution on packet loss) + fallback messaging if video fails
  return { iceServers: [...GOOGLE_STUN] };
}

export const ICE_SERVERS = GOOGLE_STUN;
