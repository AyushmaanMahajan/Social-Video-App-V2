import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('[video:jwt_verification:fail] JWT_SECRET is missing in login route');
      return Response.json({ error: 'Server JWT configuration missing' }, { status: 500 });
    }

    const body = await request.json();
    const identifier = String(body?.identifier ?? body?.email ?? body?.username ?? '').trim();
    const password = String(body?.password || '');

    if (!identifier || !password) {
      return Response.json({ error: 'Missing username/email or password' }, { status: 400 });
    }

    const result = await pool.query(
      `
      SELECT id,
             email,
             password_hash,
             email_verified,
             email_verified_at,
             username,
             COALESCE(username, name, 'User') AS name,
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
      WHERE LOWER(email) = LOWER($1)
         OR LOWER(username) = LOWER($1)
         OR LOWER(name) = LOWER($1)
      LIMIT 1
      `,
      [identifier.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = result.rows[0];
    const isValid = await bcryptjs.compare(password, user.password_hash);

    if (!isValid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.email_verified) {
      return Response.json(
        {
          error: 'Please verify your email before logging in',
          requiresEmailVerification: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    try {
      await pool.query(
        `
        INSERT INTO user_presence (user_id, online, show_status, updated_at)
        VALUES ($1, true, true, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET online = true, show_status = COALESCE(user_presence.show_status, true), updated_at = NOW()
        `,
        [user.id]
      );
    } catch (presenceError) {
      // Presence should not block authentication.
      console.error('presence update error (login)', presenceError?.message || presenceError);
    }

    delete user.password_hash;

    return Response.json({ user, token });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
