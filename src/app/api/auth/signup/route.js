import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('[video:jwt_verification:fail] JWT_SECRET is missing in signup route');
      return Response.json({ error: 'Server JWT configuration missing' }, { status: 500 });
    }

    const body = await request.json();
    const { email, password, name, age, location } = body;

    if (!email || !password || !name || !age) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, age, location) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, age, location, created_at',
      [email, hashedPassword, name, age, location || 'Unknown']
    );

    const user = result.rows[0];
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
      console.error('presence update error (signup)', presenceError?.message || presenceError);
    }

    return Response.json({ user, token }, { status: 201 });
  } catch (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'Email already exists' }, { status: 400 });
    }
    console.error(error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
