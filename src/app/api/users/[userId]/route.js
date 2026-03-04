import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const viewerId = auth.userId;
  const userId = Number(params.userId);
  if (!userId) {
    return Response.json({ error: 'Invalid user id' }, { status: 400 });
  }

  try {
    const blockCheck = await pool.query(
      `
      SELECT 1
      FROM blocks
      WHERE (blocker_id = $1 AND blocked_id = $2)
         OR (blocker_id = $2 AND blocked_id = $1)
      LIMIT 1
      `,
      [viewerId, userId]
    );
    if (blockCheck.rows.length > 0) {
      return Response.json({ error: 'This profile is not available.' }, { status: 403 });
    }

    const userResult = await pool.query(
      `
      SELECT id,
             COALESCE(username, name, 'User') AS name,
             username,
             COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, birthdate))::int, age) AS age,
             location,
             about,
             currently_into,
             ask_me_about,
             accent_theme,
             show_age,
             show_location,
             show_active_status,
             gender,
             gender_visible,
             created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];
    if (Number(user.id) !== Number(viewerId) && !user.gender_visible) {
      user.gender = null;
    }

    const photosResult = await pool.query('SELECT url FROM photos WHERE user_id = $1 ORDER BY order_index', [userId]);
    const promptsResult = await pool.query('SELECT question, answer FROM prompts WHERE user_id = $1 ORDER BY order_index', [userId]);
    const interestsResult = await pool.query('SELECT label FROM interests WHERE user_id = $1', [userId]);

    user.photos = photosResult.rows.map((p) => p.url);
    user.prompts = promptsResult.rows;
    user.interests = interestsResult.rows.map((i) => i.label);

    return Response.json(user);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
