import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;
  try {
    const res = await pool.query(
      'SELECT show_status FROM user_presence WHERE user_id = $1',
      [auth.userId]
    );
    const showStatus = res.rows[0] ? Boolean(res.rows[0].show_status) : true;
    return Response.json({ showStatus });
  } catch (error) {
    console.error('presence visibility get error', error);
    return Response.json({ showStatus: true });
  }
}

export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;
  try {
    const body = await request.json();
    const { showStatus } = body || {};
    const normalized = Boolean(showStatus);
    await pool.query(
      `
      INSERT INTO user_presence (user_id, show_status, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id) DO UPDATE SET show_status = EXCLUDED.show_status, updated_at = NOW()
      `,
      [auth.userId, normalized]
    );
    return Response.json({ showStatus: normalized });
  } catch (error) {
    console.error('presence visibility post error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
