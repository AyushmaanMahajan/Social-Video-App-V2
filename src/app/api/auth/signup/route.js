import bcryptjs from 'bcryptjs';
import pool from '@/lib/db';
import { issueEmailVerificationToken } from '@/lib/emailVerification';
import { getVerificationUrl, sendVerificationEmail } from '@/lib/mailer';
import { isDisposableEmailDomain, normalizeEmail, validateUsername } from '@/lib/onboardingValidation';

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body?.username || '').trim();
    const email = normalizeEmail(body?.email);
    const password = String(body?.password || '');

    if (!username || !email || !password) {
      return Response.json({ error: 'Username, email and password are required.' }, { status: 400 });
    }

    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      return Response.json({ error: usernameCheck.error }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    if (isDisposableEmailDomain(email)) {
      return Response.json(
        { error: 'Disposable email addresses are not allowed. Please use a permanent email.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const existingEmail = await pool.query(
      `
      SELECT 1
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );
    if (existingEmail.rows.length > 0) {
      return Response.json({ error: 'Email already exists' }, { status: 400 });
    }

    const existingUsername = await pool.query(
      `
      SELECT 1
      FROM users
      WHERE LOWER(COALESCE(username, name, '')) = LOWER($1)
      LIMIT 1
      `,
      [usernameCheck.username]
    );
    if (existingUsername.rows.length > 0) {
      return Response.json({ error: 'Username is already taken' }, { status: 400 });
    }

    const result = await pool.query(
      `
      INSERT INTO users (email, password_hash, name, username, email_verified, onboarding_completed)
      VALUES ($1, $2, $3, $3, FALSE, FALSE)
      RETURNING id, email, username, created_at
      `,
      [email, hashedPassword, usernameCheck.username]
    );

    const user = result.rows[0];
    let verificationToken = null;
    let emailSent = true;
    let verificationError = null;
    let devVerificationUrl = null;

    try {
      verificationToken = await issueEmailVerificationToken(user.id);
      await sendVerificationEmail({
        toEmail: user.email,
        toName: user.username || 'there',
        token: verificationToken,
      });
    } catch (mailError) {
      emailSent = false;
      if (mailError?.code === 'VERIFICATION_RATE_LIMIT') {
        return Response.json({ error: mailError.message }, { status: 429 });
      }
      if (mailError?.code === 'MAILER_NOT_CONFIGURED') {
        verificationError = 'Verification email service is not configured on this server.';
        if (process.env.NODE_ENV !== 'production' && verificationToken) {
          devVerificationUrl = getVerificationUrl(verificationToken);
        }
      }
      console.error('verification email send error (signup)', mailError?.message || mailError);
    }

    return Response.json(
      {
        requiresEmailVerification: true,
        emailSent,
        verificationError,
        devVerificationUrl,
        onboardingRequired: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          created_at: user.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === '23505') {
      if (String(error?.constraint || '').includes('username')) {
        return Response.json({ error: 'Username is already taken' }, { status: 400 });
      }
      return Response.json({ error: 'Email already exists' }, { status: 400 });
    }
    console.error(error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
