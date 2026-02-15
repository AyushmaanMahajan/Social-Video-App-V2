import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function PUT(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const userId = auth.userId;

  try {
    const body = await request.json();
    const name = body.name;
    const age = body.age;
    const location = body.location;
    const about = body.about;
    const currently_into = body.currently_into ?? body.currentlyInto;
    const ask_me_about = body.ask_me_about ?? body.askMeAbout;
    const accent_theme = body.accent_theme ?? body.accentTheme ?? 'cyan';
    const show_age = body.show_age ?? body.showAge;
    const show_location = body.show_location ?? body.showLocation;
    const show_active_status = body.show_active_status ?? body.showActiveStatus;
    const photos = body.photos;
    const prompts = body.prompts;
    const interests = body.interests;

    await pool.query(
      'UPDATE users SET name = $1, age = $2, location = $3, about = $4, currently_into = $5, ask_me_about = $6, accent_theme = $7, show_age = $8, show_location = $9, show_active_status = $10 WHERE id = $11',
      [
        name,
        age,
        location,
        about,
        currently_into,
        ask_me_about,
        accent_theme,
        show_age !== false,
        show_location !== false,
        show_active_status !== false,
        userId,
      ]
    );

    if (photos) {
      await pool.query('DELETE FROM photos WHERE user_id = $1', [userId]);
      for (let i = 0; i < photos.length; i++) {
        await pool.query('INSERT INTO photos (user_id, url, order_index) VALUES ($1, $2, $3)', [
          userId,
          photos[i],
          i,
        ]);
      }
    }

    if (prompts) {
      await pool.query('DELETE FROM prompts WHERE user_id = $1', [userId]);
      for (let i = 0; i < prompts.length; i++) {
        await pool.query(
          'INSERT INTO prompts (user_id, question, answer, order_index) VALUES ($1, $2, $3, $4)',
          [userId, prompts[i].question, prompts[i].answer, i]
        );
      }
    }

    if (interests) {
      await pool.query('DELETE FROM interests WHERE user_id = $1', [userId]);
      for (const interest of interests) {
        await pool.query('INSERT INTO interests (user_id, label) VALUES ($1, $2)', [userId, interest]);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
