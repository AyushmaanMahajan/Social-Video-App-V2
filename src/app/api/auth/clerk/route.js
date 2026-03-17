import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { clerkClient, getAuth } from '@clerk/nextjs/server';
import { normalizeEmail, validateUsername } from '@/lib/onboardingValidation';

const MAX_USERNAME_LENGTH = 20;

function sanitizeUsernameBase(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  return raw
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_USERNAME_LENGTH);
}

async function isUsernameAvailable(username) {
  const res = await pool.query(
    `
    SELECT 1
    FROM users
    WHERE LOWER(COALESCE(username, name, '')) = LOWER($1)
    LIMIT 1
    `,
    [username]
  );
  return res.rows.length === 0;
}

async function generateUsername({ email, name }) {
  const emailLocal = String(email || '').split('@')[0] || '';
  let base = sanitizeUsernameBase(name) || sanitizeUsernameBase(emailLocal) || 'user';
  if (base.length < 3) base = `${base}user`.slice(0, MAX_USERNAME_LENGTH);

  for (let i = 0; i < 30; i += 1) {
    const suffix = i === 0 ? '' : String(Math.floor(Math.random() * 9000) + 1000);
    const candidate = `${base}${suffix}`.slice(0, MAX_USERNAME_LENGTH);
    const validation = validateUsername(candidate);
    if (!validation.valid) continue;
    // eslint-disable-next-line no-await-in-loop
    if (await isUsernameAvailable(validation.username)) return validation.username;
  }

  const fallback = `user${Math.floor(Math.random() * 900000 + 100000)}`;
  return fallback.slice(0, MAX_USERNAME_LENGTH);
}

export async function POST(request) {
  try {
    if (!process.env.JWT_SECRET) {
      return Response.json({ error: 'Server JWT configuration missing' }, { status: 500 });
    }

    const { userId } = getAuth(request);
    if (!userId) {
      return Response.json({ error: 'Not authenticated with Clerk' }, { status: 401 });
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const primaryEmailId = clerkUser.primaryEmailAddressId;
    const emailEntry = clerkUser.emailAddresses.find((item) => item.id === primaryEmailId) || clerkUser.emailAddresses[0];
    const email = normalizeEmail(emailEntry?.emailAddress);
    if (!email) {
      return Response.json({ error: 'Email not available from Clerk' }, { status: 400 });
    }

    const emailVerified = emailEntry?.verification?.status === 'verified';
    const displayName =
      clerkUser.fullName ||
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      email.split('@')[0];

    const existing = await pool.query(
      `
      SELECT id, email_verified
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    let userIdToUse = null;
    if (existing.rows.length > 0) {
      userIdToUse = existing.rows[0].id;
      if (emailVerified && !existing.rows[0].email_verified) {
        await pool.query(
          `
          UPDATE users
          SET email_verified = true, email_verified_at = NOW()
          WHERE id = $1
          `,
          [userIdToUse]
        );
      }
    } else {
      const username = await generateUsername({ email, name: displayName });
      const randomPassword = crypto.randomBytes(24).toString('hex');
      const passwordHash = await bcryptjs.hash(randomPassword, 10);

      const insert = await pool.query(
        `
        INSERT INTO users (email, password_hash, name, username, email_verified, email_verified_at, onboarding_completed)
        VALUES ($1, $2, $3, $4, $5, $6, FALSE)
        RETURNING id
        `,
        [email, passwordHash, displayName || username, username, emailVerified, emailVerified ? new Date() : null]
      );
      userIdToUse = insert.rows[0].id;
    }

    const token = jwt.sign({ userId: userIdToUse }, process.env.JWT_SECRET, { expiresIn: '7d' });

    try {
      await pool.query(
        `
        INSERT INTO user_presence (user_id, online, show_status, updated_at)
        VALUES ($1, true, true, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET online = true, show_status = COALESCE(user_presence.show_status, true), updated_at = NOW()
        `,
        [userIdToUse]
      );
    } catch {
      // Presence should not block authentication.
    }

    return Response.json({ token });
  } catch (error) {
    console.error('Clerk auth exchange error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
