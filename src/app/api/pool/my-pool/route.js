import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const userId = auth.userId;

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.age, u.location, u.about 
       FROM users u 
       INNER JOIN pools p ON u.id = p.added_user_id 
       WHERE p.user_id = $1`,
      [userId]
    );

    const profiles = await Promise.all(
      result.rows.map(async (user) => {
        const photos = await pool.query(
          'SELECT url FROM photos WHERE user_id = $1 ORDER BY order_index LIMIT 1',
          [user.id]
        );
        const interests = await pool.query(
          'SELECT label FROM interests WHERE user_id = $1 LIMIT 5',
          [user.id]
        );

        return {
          ...user,
          photos: photos.rows.map((p) => p.url),
          interests: interests.rows.map((i) => i.label),
        };
      })
    );

    return Response.json(profiles);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
