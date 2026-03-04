const windows = new Map();

function isRateLimited({ key, limit, windowMs }) {
  if (!key) return false;
  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.windowStart >= windowMs) {
    windows.set(key, { windowStart: now, count: 1 });
    return false;
  }

  current.count += 1;
  windows.set(key, current);
  return current.count > limit;
}

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

module.exports = {
  getClientIp,
  isRateLimited,
};
