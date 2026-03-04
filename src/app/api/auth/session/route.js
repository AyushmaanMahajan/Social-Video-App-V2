import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

function getTokenFromCookieHeader(cookieHeader) {
  const raw = String(cookieHeader || '');
  if (!raw) return null;
  const pair = raw
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('token='));
  if (!pair) return null;
  return decodeURIComponent(pair.slice('token='.length));
}

function getTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return getTokenFromCookieHeader(request.headers.get('cookie'));
}

export async function GET(request) {
  try {
    if (!process.env.JWT_SECRET) {
      return Response.json({ user: null });
    }

    const token = getTokenFromRequest(request);
    if (!token) {
      return Response.json({ user: null });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return Response.json({ user: null });
    }

    const userId = Number(decoded?.userId);
    if (!userId) return Response.json({ user: null });

    const result = await pool.query(
      `
      SELECT id,
             email,
             COALESCE(username, name, 'User') AS name,
             onboarding_completed,
             email_verified
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    const user = result.rows[0] || null;
    return Response.json({ user });
  } catch (error) {
    console.error('auth session error', error);
    return Response.json({ user: null });
  }
}
