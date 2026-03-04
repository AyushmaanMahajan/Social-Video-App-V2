import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;
  const userId = auth.userId;

  try {
    const result = await pool.query(
      `
      SELECT
        u.id,
        COALESCE(u.username, u.name, 'User') AS name,
        COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, u.birthdate))::int, u.age) AS age,
        u.location,
        s.skipped_at AS "skippedAt",
        (
          SELECT p.url
          FROM photos p
          WHERE p.user_id = u.id
          ORDER BY p.order_index
          LIMIT 1
        ) AS photo
      FROM encounter_skips s
      JOIN users u ON u.id = s.skipped_user_id
      WHERE s.user_id = $1
      ORDER BY s.skipped_at DESC
      `,
      [userId]
    );

    return Response.json({ profiles: result.rows });
  } catch (error) {
    console.error('Encounter passed list error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;
  const userId = auth.userId;

  try {
    const result = await pool.query(
      `
      DELETE FROM encounter_skips
      WHERE user_id = $1
      `,
      [userId]
    );

    return Response.json({ success: true, restoredCount: result.rowCount || 0 });
  } catch (error) {
    console.error('Encounter passed restore error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
