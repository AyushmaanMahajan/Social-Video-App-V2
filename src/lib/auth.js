const jwt = require('jsonwebtoken');

/**
 * Get userId from Authorization: Bearer <token> header. Returns null if invalid/missing.
 * @param {Request} request - Next.js request
 * @returns {{ userId: number } | null}
 */
function getAuthUserId(request) {
  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

/**
 * Require auth. Returns JSON error response if not authenticated.
 * @param {Request} request
 * @returns {{ userId: number } | NextResponse}
 */
function requireAuth(request) {
  const auth = getAuthUserId(request);
  if (auth) return auth;
  return Response.json({ error: 'No token provided' }, { status: 401 });
}

module.exports = { getAuthUserId, requireAuth };
