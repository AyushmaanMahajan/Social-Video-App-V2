import pool from '@/lib/db';
import { issueEmailVerificationToken } from '@/lib/emailVerification';
import { getVerificationUrl, sendVerificationEmail } from '@/lib/mailer';
import { normalizeEmail } from '@/lib/onboardingValidation';
import { getClientIp, isRateLimited } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body?.email);
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const tooManyByIp = isRateLimited({
      key: `resend:${ip}`,
      limit: 8,
      windowMs: 30 * 60 * 1000,
    });
    if (tooManyByIp) {
      return Response.json(
        { error: 'Too many verification email requests. Please try again later.' },
        { status: 429 }
      );
    }

    const result = await pool.query(
      'SELECT id, email, username, name, email_verified FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );

    if (!result.rows.length || result.rows[0].email_verified) {
      return Response.json({ success: true });
    }

    const user = result.rows[0];
    let verificationToken;
    try {
      verificationToken = await issueEmailVerificationToken(user.id);
    } catch (tokenError) {
      if (tokenError?.code === 'VERIFICATION_RATE_LIMIT') {
        return Response.json({ error: tokenError.message }, { status: 429 });
      }
      throw tokenError;
    }
    try {
      await sendVerificationEmail({
        toEmail: user.email,
        toName: user.username || user.name || 'there',
        token: verificationToken,
      });
      return Response.json({ success: true, emailSent: true });
    } catch (mailError) {
      if (mailError?.code === 'MAILER_NOT_CONFIGURED') {
        const payload = {
          success: true,
          emailSent: false,
          error: 'Verification email service is not configured on this server.',
        };
        if (process.env.NODE_ENV !== 'production') {
          payload.devVerificationUrl = getVerificationUrl(verificationToken);
        }
        return Response.json(payload);
      }
      throw mailError;
    }
  } catch (error) {
    console.error('resend-verification error', error);
    return Response.json({ error: 'Could not send verification email' }, { status: 500 });
  }
}
