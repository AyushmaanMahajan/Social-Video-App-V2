import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  try {
    await pool.query(
      `
      INSERT INTO user_presence (user_id, online, show_status, updated_at)
      VALUES ($1, false, true, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET online = false, updated_at = NOW()
      `,
      [auth.userId]
    );
    return Response.json({ success: true });
  } catch (error) {
    console.error('logout presence update error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
