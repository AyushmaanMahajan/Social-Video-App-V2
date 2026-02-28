const GOOGLE_STUN = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

function normalizeIceUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^(stun|stuns|turn|turns):/i.test(raw)) return raw;
  // TURN env values are often configured as host:port; default to turn: scheme.
  return `turn:${raw}`;
}

function getTurnServerFromEnv() {
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL || process.env.TURN_URL;
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME || process.env.TURN_USERNAME;
  const credential = process.env.NEXT_PUBLIC_TURN_PASSWORD || process.env.TURN_PASSWORD;

  if (!turnUrl || !username || !credential) return null;
  const rawUrls = turnUrl.split(',').map((v) => v.trim()).filter(Boolean);
  const urls = rawUrls.map(normalizeIceUrl).filter(Boolean);
  if (!urls.length) return null;
  if (rawUrls.some((value, index) => value !== urls[index])) {
    console.warn('[video:ice_state:warn] TURN_URL entry missing stun/turn scheme; auto-normalized.');
  }
  return {
    urls,
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
