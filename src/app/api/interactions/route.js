import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const userId = auth.userId;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  try {
    const params = [userId];
    let searchClause = '';
    if (search) {
      params.push(`%${search}%`);
      searchClause = 'AND u.name ILIKE $2';
    }

    const result = await pool.query(
      `
      SELECT i.id,
             CASE WHEN i.user_a = $1 THEN i.user_b ELSE i.user_a END AS other_user_id,
             i.status,
             i.last_interaction_at
      FROM interactions i
      WHERE (i.user_a = $1 OR i.user_b = $1)
        AND i.status = 'connected'
      ORDER BY i.last_interaction_at DESC
      `,
      params.slice(0, 1)
    );

    const otherIds = result.rows.map((r) => Number(r.other_user_id));
    if (!otherIds.length) {
      return Response.json({ interactions: [] });
    }

    const profiles = await pool.query(
      `
        SELECT id, name, age, location
        FROM users u
        WHERE id = ANY($1)
        ${searchClause}
      `,
      search ? [otherIds, `%${search}%`] : [otherIds]
    );
    const profileMap = new Map(profiles.rows.map((p) => [Number(p.id), p]));

    const enriched = await Promise.all(
      result.rows
        .filter((r) => profileMap.has(Number(r.other_user_id)))
        .map(async (row) => {
          const photos = await pool.query(
            'SELECT url FROM photos WHERE user_id = $1 ORDER BY order_index LIMIT 1',
            [row.other_user_id]
          );
          return {
            id: row.id,
            otherUserId: Number(row.other_user_id),
            status: row.status,
            lastInteractionAt: row.last_interaction_at,
            user: {
              ...profileMap.get(Number(row.other_user_id)),
              photo: photos.rows[0]?.url || null,
            },
          };
        })
    );

    return Response.json({ interactions: enriched });
  } catch (error) {
    console.error('Interactions list error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
