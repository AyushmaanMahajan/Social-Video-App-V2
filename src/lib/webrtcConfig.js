const GOOGLE_STUN = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

function getTurnServerFromEnv() {
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL || process.env.TURN_URL;
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME || process.env.TURN_USERNAME;
  const credential = process.env.NEXT_PUBLIC_TURN_PASSWORD || process.env.TURN_PASSWORD;

  if (!turnUrl || !username || !credential) return null;
  return {
    urls: turnUrl.split(',').map((v) => v.trim()).filter(Boolean),
    username,
    credential,
  };
}

export function getIceServers({ forceTurn = false } = {}) {
  const turn = getTurnServerFromEnv();
  const servers = forceTurn ? [] : [...GOOGLE_STUN];
  if (turn) {
    servers.push(turn);
  }
  if (!turn) {
    console.warn('[video:ice_state:warn] TURN is not configured; some networks may fail WebRTC connectivity.');
  }
  return { iceServers: servers };
}

export const ICE_SERVERS = GOOGLE_STUN;
