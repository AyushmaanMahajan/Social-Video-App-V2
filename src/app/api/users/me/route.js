import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const userId = auth.userId;

  try {
    const userResult = await pool.query(
      'SELECT id, email, name, age, location, about, currently_into, ask_me_about, accent_theme, show_age, show_location, show_active_status, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];

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

export async function DELETE(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const userId = auth.userId;

  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const confirmation = String(body?.confirmation || '').trim().toLowerCase();
    if (confirmation !== 'delete') {
      return Response.json({ error: 'Type "delete" to confirm account deletion.' }, { status: 400 });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    if (result.rowCount === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
