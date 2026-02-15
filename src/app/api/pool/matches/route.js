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
       INNER JOIN pools p1 ON u.id = p1.added_user_id 
       INNER JOIN pools p2 ON u.id = p2.user_id 
       WHERE p1.user_id = $1 AND p2.added_user_id = $1`,
      [userId]
    );

    const profiles = await Promise.all(
      result.rows.map(async (user) => {
        const photos = await pool.query('SELECT url FROM photos WHERE user_id = $1 ORDER BY order_index', [
          user.id,
        ]);
        const prompts = await pool.query(
          'SELECT question, answer FROM prompts WHERE user_id = $1 ORDER BY order_index',
          [user.id]
        );
        const interests = await pool.query('SELECT label FROM interests WHERE user_id = $1', [user.id]);

        return {
          ...user,
          photos: photos.rows.map((p) => p.url),
          prompts: prompts.rows,
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
