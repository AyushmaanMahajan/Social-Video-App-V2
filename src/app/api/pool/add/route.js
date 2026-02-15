import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const userId = auth.userId;

  try {
    const body = await request.json();
    const { addedUserId } = body;

    if (userId === addedUserId) {
      return Response.json({ error: 'Cannot add yourself' }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO pools (user_id, added_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, addedUserId]
    );

    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
