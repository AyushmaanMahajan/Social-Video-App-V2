import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const VALID_STATUSES = ['connected', 'skipped', 'timeout'];

function normalizePair(a, b) {
  const userA = Math.min(Number(a), Number(b));
  const userB = Math.max(Number(a), Number(b));
  return [userA, userB];
}

export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;
  const userId = auth.userId;

  try {
    const body = await request.json();
    const { otherUserId, status } = body || {};
    if (!otherUserId || !VALID_STATUSES.includes(status)) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const [userA, userB] = normalizePair(userId, otherUserId);

    await pool.query(
      `
      INSERT INTO interactions (user_a, user_b, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_a, user_b)
      DO UPDATE SET status = EXCLUDED.status, last_interaction_at = NOW()
      `,
      [userA, userB, status]
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Interaction record error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
