import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const userId = auth.userId;

  try {
    const addedUserIds = await pool.query('SELECT added_user_id FROM pools WHERE user_id = $1', [userId]);

    const excludedIds = [userId, ...addedUserIds.rows.map((r) => r.added_user_id)];

    const placeholders = excludedIds.map((_, i) => `$${i + 1}`).join(',');

    const result = await pool.query(
      `SELECT id, name, age, location, about, currently_into, ask_me_about, created_at 
       FROM users 
       WHERE id NOT IN (${placeholders}) 
       ORDER BY created_at DESC 
       LIMIT 50`,
      excludedIds
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
