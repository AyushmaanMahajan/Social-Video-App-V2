import jwt from 'jsonwebtoken';
import { verifyEmailToken } from '@/lib/emailVerification';
import { getClientIp, isRateLimited } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    if (!process.env.JWT_SECRET) {
      return Response.json({ error: 'Server JWT configuration missing' }, { status: 500 });
    }

    const body = await request.json();
    const token = body?.token;
    if (!token) {
      return Response.json({ error: 'Verification token is required' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const tooManyAttempts = isRateLimited({
      key: `verify-email:${ip}`,
      limit: 20,
      windowMs: 30 * 60 * 1000,
    });
    if (tooManyAttempts) {
      return Response.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const user = await verifyEmailToken(token);
    if (!user) {
      return Response.json({ error: 'Invalid or expired verification link' }, { status: 400 });
    }

    const authToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return Response.json({
      success: true,
      user,
      token: authToken,
      onboardingRequired: !user.onboarding_completed,
    });
  } catch (error) {
    console.error('verify-email error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
