import bcryptjs from 'bcryptjs';
import pool from '@/lib/db';
import { issueEmailVerificationToken } from '@/lib/emailVerification';
import { sendVerificationEmail } from '@/lib/mailer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, name, age, location } = body;

    if (!email || !password || !name || !age) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (email, password_hash, name, age, location, email_verified)
      VALUES ($1, $2, $3, $4, $5, FALSE)
      RETURNING id, email, name, age, location, created_at
      `,
      [email, hashedPassword, name, age, location || 'Unknown']
    );

    const user = result.rows[0];
    const verificationToken = await issueEmailVerificationToken(user.id);
    let emailSent = true;

    try {
      await sendVerificationEmail({
        toEmail: user.email,
        toName: user.name,
        token: verificationToken,
      });
    } catch (mailError) {
      emailSent = false;
      console.error('verification email send error (signup)', mailError?.message || mailError);
    }

    return Response.json(
      {
        requiresEmailVerification: true,
        emailSent,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          age: user.age,
          location: user.location,
          created_at: user.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'Email already exists' }, { status: 400 });
    }
    console.error(error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
