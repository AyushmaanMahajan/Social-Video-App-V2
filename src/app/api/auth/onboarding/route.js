import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import {
  validateBirthdate,
  validateGender,
  validateUsername,
} from '@/lib/onboardingValidation';

const PHOTO_URL_REGEX = /^https?:\/\//i;
const PHOTO_BLOCKED_TERMS = ['nude', 'nudity', 'porn', 'explicit', 'nsfw', 'sexual'];

function isPhotoUrlValid(urlValue) {
  const url = String(urlValue || '').trim();
  if (!url) return true;
  if (!PHOTO_URL_REGEX.test(url)) return false;
  if (/^data:/i.test(url)) return false;
  return true;
}

function passesBasicPhotoModeration(urlValue) {
  const url = String(urlValue || '').toLowerCase();
  if (!url) return true;
  return !PHOTO_BLOCKED_TERMS.some((term) => url.includes(term));
}

export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  try {
    const body = await request.json();
    const usernameCheck = validateUsername(body?.username);
    if (!usernameCheck.valid) {
      return Response.json({ error: usernameCheck.error }, { status: 400 });
    }

    const birthdateCheck = validateBirthdate(body?.birthdate);
    if (!birthdateCheck.valid) {
      return Response.json({ error: birthdateCheck.error }, { status: 400 });
    }

    const genderCheck = validateGender(body?.gender);
    if (!genderCheck.valid) {
      return Response.json({ error: genderCheck.error }, { status: 400 });
    }

    const genderVisible =
      typeof body?.genderVisible === 'boolean' ? body.genderVisible : true;
    const showLocation =
      typeof body?.showLocation === 'boolean' ? body.showLocation : true;
    const location = String(body?.location || '').trim().slice(0, 100);
    const safetyAcknowledged = Boolean(body?.safetyAcknowledged);
    if (!safetyAcknowledged) {
      return Response.json(
        { error: 'Safety acknowledgement is required before entering encounters.' },
        { status: 400 }
      );
    }

    const profilePhotoUrl = String(body?.profilePhotoUrl || '').trim();
    if (!isPhotoUrlValid(profilePhotoUrl)) {
      return Response.json({ error: 'Profile photo URL must be a valid http(s) URL.' }, { status: 400 });
    }
    if (!passesBasicPhotoModeration(profilePhotoUrl)) {
      return Response.json(
        { error: 'Profile photo did not pass moderation checks.' },
        { status: 400 }
      );
    }

    const existingUser = await pool.query(
      `
      SELECT id, email_verified, onboarding_completed, birthdate, gender
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [auth.userId]
    );

    if (!existingUser.rows.length) {
      return Response.json({ error: 'User not found.' }, { status: 404 });
    }

    const user = existingUser.rows[0];
    if (!user.email_verified) {
      return Response.json(
        { error: 'Please verify your email before onboarding.' },
        { status: 403 }
      );
    }

    if (user.onboarding_completed) {
      return Response.json({ error: 'Onboarding is already complete.' }, { status: 409 });
    }

    if (user.birthdate) {
      return Response.json({ error: 'Birthdate cannot be changed.' }, { status: 400 });
    }
    if (user.gender) {
      return Response.json({ error: 'Gender cannot be changed.' }, { status: 400 });
    }

    const usernameCollision = await pool.query(
      `
      SELECT 1
      FROM users
      WHERE LOWER(COALESCE(username, name, '')) = LOWER($1)
        AND id <> $2
      LIMIT 1
      `,
      [usernameCheck.username, auth.userId]
    );
    if (usernameCollision.rows.length > 0) {
      return Response.json({ error: 'Username is already taken.' }, { status: 409 });
    }

    const updated = await pool.query(
      `
      UPDATE users
      SET username = $1,
          name = $1,
          birthdate = $2,
          age = $3,
          gender = $4,
          gender_visible = $5,
          location = NULLIF($6, ''),
          show_location = $7,
          safety_acknowledged = TRUE,
          onboarding_completed = TRUE
      WHERE id = $8
      RETURNING id,
                email,
                username,
                COALESCE(username, name, 'User') AS name,
                birthdate,
                COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, birthdate))::int, age) AS age,
                gender,
                gender_visible,
                location,
                show_location,
                onboarding_completed,
                safety_acknowledged,
                created_at
      `,
      [
        usernameCheck.username,
        birthdateCheck.birthdate,
        birthdateCheck.age,
        genderCheck.gender,
        genderVisible,
        location,
        showLocation,
        auth.userId,
      ]
    );

    if (profilePhotoUrl) {
      const existingMainPhoto = await pool.query(
        `
        SELECT id
        FROM photos
        WHERE user_id = $1 AND order_index = 0
        LIMIT 1
        `,
        [auth.userId]
      );

      if (existingMainPhoto.rows.length) {
        await pool.query(
          `UPDATE photos SET url = $1 WHERE id = $2`,
          [profilePhotoUrl, existingMainPhoto.rows[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO photos (user_id, url, order_index) VALUES ($1, $2, 0)`,
          [auth.userId, profilePhotoUrl]
        );
      }
    }

    return Response.json({
      success: true,
      user: updated.rows[0],
    });
  } catch (error) {
    if (error?.code === '23505') {
      return Response.json({ error: 'Username is already taken.' }, { status: 409 });
    }

    console.error('onboarding completion error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
