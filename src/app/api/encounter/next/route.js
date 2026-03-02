import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * Return one eligible encounter profile.
 * Excludes: self, reported/blocked pairs, active calls, and skips in last 24h.
 */
export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const userId = auth.userId;

  try {
    await pool.query(
      `
      INSERT INTO user_presence (user_id, online, show_status, updated_at)
      VALUES ($1, true, true, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET online = true, updated_at = NOW()
      `,
      [userId]
    );

    const candidate = await pool.query(
      `
      SELECT u.id, u.name, u.age, u.location, u.about, u.currently_into, u.ask_me_about, u.created_at
      FROM users u
      LEFT JOIN user_presence up ON up.user_id = u.id
      WHERE u.id <> $1
        AND EXISTS (
          SELECT 1
          FROM user_presence me
          WHERE me.user_id = $1
            AND COALESCE(me.online, false) = true
            AND COALESCE(me.show_status, true) = true
        )
        AND NOT EXISTS (
          SELECT 1
          FROM video_calls self_vc
          WHERE (self_vc.caller_id = $1 OR self_vc.receiver_id = $1)
            AND self_vc.status = 'connected'
            AND self_vc.ended_at IS NULL
        )
        AND COALESCE(up.online, false) = true
        AND COALESCE(up.show_status, true) = true
        AND NOT EXISTS (
          SELECT 1 FROM reports r WHERE r.reporter_id = $1 AND r.reported_user_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM reports r WHERE r.reporter_id = u.id AND r.reported_user_id = $1
        )
        AND NOT EXISTS (
          SELECT 1 FROM video_calls vc
          WHERE (vc.caller_id = u.id OR vc.receiver_id = u.id)
            AND vc.status = 'connected'
            AND vc.ended_at IS NULL
        )
      ORDER BY RANDOM()
      LIMIT 1
      `,
      [userId]
    );

    if (candidate.rows.length === 0) {
      return Response.json({ profile: null });
    }

    const user = candidate.rows[0];
    const [photos, prompts, interests] = await Promise.all([
      pool.query('SELECT url FROM photos WHERE user_id = $1 ORDER BY order_index', [user.id]),
      pool.query('SELECT question, answer FROM prompts WHERE user_id = $1 ORDER BY order_index', [user.id]),
      pool.query('SELECT label FROM interests WHERE user_id = $1', [user.id]),
    ]);

    const profile = {
      ...user,
      photos: photos.rows.map((p) => p.url),
      prompts: prompts.rows,
      interests: interests.rows.map((i) => i.label),
    };

    return Response.json({ profile });
  } catch (error) {
    console.error('Encounter next error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
