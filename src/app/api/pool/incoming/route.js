import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const userId = auth.userId;

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.age, u.location, p.created_at as added_at 
       FROM users u 
       INNER JOIN pools p ON u.id = p.user_id 
       WHERE p.added_user_id = $1 
       AND NOT EXISTS (
         SELECT 1 FROM pools p2 
         WHERE p2.user_id = $1 AND p2.added_user_id = u.id
       )`,
      [userId]
    );

    const profiles = await Promise.all(
      result.rows.map(async (user) => {
        const photos = await pool.query(
          'SELECT url FROM photos WHERE user_id = $1 ORDER BY order_index LIMIT 1',
          [user.id]
        );

        return {
          ...user,
          photos: photos.rows.map((p) => p.url),
        };
      })
    );

    return Response.json(profiles);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
