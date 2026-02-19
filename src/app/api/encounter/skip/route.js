import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const userId = auth.userId;

  try {
    const body = await request.json();
    const { skippedUserId } = body || {};

    if (!skippedUserId || Number(skippedUserId) === Number(userId)) {
      return Response.json({ error: 'Invalid skippedUserId' }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO encounter_skips (user_id, skipped_user_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, skipped_user_id)
       DO UPDATE SET skipped_at = NOW()`,
      [userId, skippedUserId]
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Encounter skip error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
