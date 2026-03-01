import pool from '@/lib/db';
import { issueEmailVerificationToken } from '@/lib/emailVerification';
import { sendVerificationEmail } from '@/lib/mailer';

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const result = await pool.query(
      'SELECT id, email, name, email_verified FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (!result.rows.length || result.rows[0].email_verified) {
      return Response.json({ success: true });
    }

    const user = result.rows[0];
    const verificationToken = await issueEmailVerificationToken(user.id);
    await sendVerificationEmail({
      toEmail: user.email,
      toName: user.name,
      token: verificationToken,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('resend-verification error', error);
    return Response.json({ error: 'Could not send verification email' }, { status: 500 });
  }
}
