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
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = result.rows[0];
    const isValid = await bcryptjs.compare(password, user.password_hash);

    if (!isValid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    try {
      await pool.query(
        `
        INSERT INTO user_presence (user_id, online, show_status, updated_at)
        VALUES ($1, true, true, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET online = true, updated_at = NOW()
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
