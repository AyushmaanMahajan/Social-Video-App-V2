import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const reporterId = auth.userId;

  try {
    const body = await request.json();
    const { reportedUserId, reason } = body;

    if (!reportedUserId || !reason) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO reports (reporter_id, reported_user_id, reason) VALUES ($1, $2, $3)',
      [reporterId, reportedUserId, reason]
    );

    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
