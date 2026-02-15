import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const userId = auth.userId;
  const { targetId } = params;

  try {
    const result = await pool.query(
      `SELECT 
        EXISTS(SELECT 1 FROM pools WHERE user_id = $1 AND added_user_id = $2) as user_added,
        EXISTS(SELECT 1 FROM pools WHERE user_id = $2 AND added_user_id = $1) as target_added`,
      [userId, targetId]
    );

    const mutual = result.rows[0].user_added && result.rows[0].target_added;

    return Response.json({ mutual });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
