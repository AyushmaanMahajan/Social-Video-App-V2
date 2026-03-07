import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateUsername } from '@/lib/onboardingValidation';

const MAX_PHOTOS = 6;

const normalizePhotoUrl = (value) => String(value || '').trim();
const isValidPhotoUrl = (value) => {
  const url = normalizePhotoUrl(value);
  if (!url) return false;
  if (/^data:/i.test(url)) return false;
  return /^https?:\/\//i.test(url);
};

const selectUserById = async (userId) =>
  pool.query(
    `
    SELECT id,
           email,
           email_verified,
           COALESCE(username, name, 'User') AS name,
           username,
           birthdate,
           gender,
           gender_visible,
           onboarding_completed,
           safety_acknowledged,
           COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, birthdate))::int, age) AS age,
           location,
           about,
           currently_into,
           ask_me_about,
           accent_theme,
           show_age,
           show_location,
           show_active_status,
           created_at
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [userId]
  );

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const userId = auth.userId;

  try {
    const userResult = await selectUserById(userId);

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
    const existingResult = await pool.query(
      `
      SELECT id, username, name, birthdate, gender, onboarding_completed
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );
    if (!existingResult.rows.length) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const existing = existingResult.rows[0];

    const rawUsername = body.username ?? body.name;
    let nextUsername = null;
    if (typeof rawUsername === 'string') {
      const trimmed = rawUsername.trim();
      if (!trimmed) {
        return Response.json({ error: 'Username cannot be empty.' }, { status: 400 });
      }
      const usernameCheck = validateUsername(trimmed);
      if (!usernameCheck.valid) {
        return Response.json({ error: usernameCheck.error }, { status: 400 });
      }
      nextUsername = usernameCheck.username;

      const existingName = await pool.query(
        `
        SELECT 1
        FROM users
        WHERE LOWER(COALESCE(username, name, '')) = LOWER($1)
          AND id <> $2
        LIMIT 1
        `,
        [nextUsername, userId]
      );
      if (existingName.rows.length > 0) {
        return Response.json({ error: 'Username is already taken' }, { status: 400 });
      }
    }

    if (body.birthdate !== undefined) {
      if (!existing.onboarding_completed) {
        return Response.json(
          { error: 'Complete onboarding to set birthdate.' },
          { status: 403 }
        );
      }
      const incomingBirthdate = String(body.birthdate || '').trim();
      const persistedBirthdate = existing.birthdate
        ? new Date(existing.birthdate).toISOString().slice(0, 10)
        : '';
      if (incomingBirthdate && persistedBirthdate && incomingBirthdate !== persistedBirthdate) {
        return Response.json({ error: 'Birthdate cannot be changed.' }, { status: 400 });
      }
    }

    if (body.gender !== undefined) {
      if (!existing.onboarding_completed) {
        return Response.json(
          { error: 'Complete onboarding to set gender.' },
          { status: 403 }
        );
      }
      const incomingGender = String(body.gender || '').trim().toLowerCase();
      const persistedGender = String(existing.gender || '').trim().toLowerCase();
      if (incomingGender && persistedGender && incomingGender !== persistedGender) {
        return Response.json({ error: 'Gender cannot be changed.' }, { status: 400 });
      }
    }

    const locationInput = typeof body.location === 'string' ? body.location.trim().slice(0, 100) : '';
    const location = locationInput || null;
    const about = body.about ?? null;
    const currently_into = (body.currently_into ?? body.currentlyInto) ?? null;
    const ask_me_about = (body.ask_me_about ?? body.askMeAbout) ?? null;
    const accent_theme = (body.accent_theme ?? body.accentTheme) ?? null;
    const show_location_value = body.show_location ?? body.showLocation;
    const show_location = typeof show_location_value === 'boolean' ? show_location_value : null;
    const show_active_status_value = body.show_active_status ?? body.showActiveStatus;
    const show_active_status = typeof show_active_status_value === 'boolean' ? show_active_status_value : null;
    const gender_visible_value = body.gender_visible ?? body.genderVisible;
    const gender_visible = typeof gender_visible_value === 'boolean' ? gender_visible_value : null;
    const photos = body.photos;
    const prompts = body.prompts;
    const interests = body.interests;

    await pool.query(
      `
      UPDATE users
      SET
        username = COALESCE($1, username),
        name = COALESCE($2, name),
        location = COALESCE($3, location),
        about = COALESCE($4, about),
        currently_into = COALESCE($5, currently_into),
        ask_me_about = COALESCE($6, ask_me_about),
        accent_theme = COALESCE($7, accent_theme),
        show_age = TRUE,
        show_location = COALESCE($8, show_location),
        show_active_status = COALESCE($9, show_active_status),
        gender_visible = COALESCE($10, gender_visible)
      WHERE id = $11
      `,
      [
        nextUsername,
        nextUsername,
        location,
        about,
        currently_into,
        ask_me_about,
        accent_theme,
        show_location,
        show_active_status,
        gender_visible,
        userId,
      ]
    );

    if (Array.isArray(photos)) {
      const normalizedPhotos = photos.map(normalizePhotoUrl).filter(Boolean);
      if (normalizedPhotos.length > MAX_PHOTOS) {
        return Response.json({ error: `You can save up to ${MAX_PHOTOS} photos.` }, { status: 400 });
      }
      if (normalizedPhotos.some((url) => !isValidPhotoUrl(url))) {
        return Response.json({ error: 'Invalid photo URL. Base64 values are not allowed.' }, { status: 400 });
      }

      await pool.query('DELETE FROM photos WHERE user_id = $1', [userId]);
      for (let i = 0; i < normalizedPhotos.length; i++) {
        await pool.query('INSERT INTO photos (user_id, url, order_index) VALUES ($1, $2, $3)', [
          userId,
          normalizedPhotos[i],
          i,
        ]);
      }
    }

    if (Array.isArray(prompts)) {
      await pool.query('DELETE FROM prompts WHERE user_id = $1', [userId]);
      for (let i = 0; i < prompts.length; i++) {
        await pool.query(
          'INSERT INTO prompts (user_id, question, answer, order_index) VALUES ($1, $2, $3, $4)',
          [userId, prompts[i].question, prompts[i].answer, i]
        );
      }
    }

    if (Array.isArray(interests)) {
      await pool.query('DELETE FROM interests WHERE user_id = $1', [userId]);
      for (const interest of interests) {
        await pool.query('INSERT INTO interests (user_id, label) VALUES ($1, $2)', [userId, interest]);
      }
    }

    const refreshed = await selectUserById(userId);
    return Response.json({ success: true, user: refreshed.rows[0] });
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
