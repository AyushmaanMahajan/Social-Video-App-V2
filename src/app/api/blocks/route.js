import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  try {
    const result = await pool.query(
      `
      SELECT b.blocked_id AS "blockedUserId",
             COALESCE(u.username, u.name, 'User') AS "blockedUsername",
             b.created_at AS "createdAt"
      FROM blocks b
      JOIN users u ON u.id = b.blocked_id
      WHERE b.blocker_id = $1
      ORDER BY b.created_at DESC
      `,
      [auth.userId]
    );
    return Response.json({ blocks: result.rows });
  } catch (error) {
    console.error('blocks list error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  try {
    const body = await request.json();
    const blockedUserId = Number(body?.blockedUserId);
    if (!blockedUserId || blockedUserId === Number(auth.userId)) {
      return Response.json({ error: 'Invalid blocked user id.' }, { status: 400 });
    }

    const userExists = await pool.query('SELECT 1 FROM users WHERE id = $1 LIMIT 1', [blockedUserId]);
    if (!userExists.rows.length) {
      return Response.json({ error: 'User not found.' }, { status: 404 });
    }

    await pool.query(
      `
      INSERT INTO blocks (blocker_id, blocked_id)
      VALUES ($1, $2)
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING
      `,
      [auth.userId, blockedUserId]
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('block create error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  try {
    const body = await request.json();
    const blockedUserId = Number(body?.blockedUserId);
    if (!blockedUserId) {
      return Response.json({ error: 'Invalid blocked user id.' }, { status: 400 });
    }

    await pool.query(
      `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
      [auth.userId, blockedUserId]
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('block delete error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
