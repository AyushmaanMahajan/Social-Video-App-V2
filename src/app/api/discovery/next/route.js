import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { isSuspendedUntil } from '@/lib/userAccess';

const STALE_SESSION_INTERVAL = '24 hours';
const SAME_NON_BINARY_GROUP = ['non-binary', 'prefer_not_to_say'];

function normalizeGender(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'prefer-not-to-say' || normalized === 'prefer not to say') {
    return 'prefer_not_to_say';
  }
  if (normalized === 'non binary') return 'non-binary';
  return normalized;
}

function resolveTargetGenders(currentGender, isSameSlot) {
  const normalized = normalizeGender(currentGender);

  if (normalized === 'male') {
    return isSameSlot ? ['male'] : ['female', 'non-binary', 'prefer_not_to_say'];
  }

  if (normalized === 'female') {
    return isSameSlot ? ['female'] : ['male', 'non-binary', 'prefer_not_to_say'];
  }

  if (isSameSlot) {
    return SAME_NON_BINARY_GROUP;
  }

  return [Math.random() < 0.5 ? 'male' : 'female'];
}

async function findCandidate(client, { userId, seenUserIds = [], targetGenders = [] }) {
  const applyGenderFilter = Array.isArray(targetGenders) && targetGenders.length > 0;
  const result = await client.query(
    `
    SELECT u.id,
           u.username,
           COALESCE(u.username, u.name, 'User') AS name,
           COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, u.birthdate))::int, u.age) AS age,
           u.location,
           u.show_location,
           u.about,
           u.currently_into,
           u.ask_me_about,
           u.gender,
           u.gender_visible,
           u.created_at
    FROM users u
    LEFT JOIN user_presence up ON up.user_id = u.id
    WHERE u.id <> $1
      AND u.email_verified = TRUE
      AND u.onboarding_completed = TRUE
      AND COALESCE(u.is_discoverable, TRUE) = TRUE
      AND u.gender IS NOT NULL
      AND (u.suspension_until IS NULL OR u.suspension_until <= NOW())
      AND COALESCE(up.online, FALSE) = TRUE
      AND COALESCE(up.show_status, TRUE) = TRUE
      AND NOT (u.id = ANY($2::INTEGER[]))
      AND ($3::BOOLEAN = FALSE OR u.gender = ANY($4::TEXT[]))
      AND NOT EXISTS (
        SELECT 1 FROM reports r WHERE r.reporter_id = $1 AND r.reported_user_id = u.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM reports r WHERE r.reporter_id = u.id AND r.reported_user_id = $1
      )
      AND NOT EXISTS (
        SELECT 1
        FROM blocks b
        WHERE (b.blocker_id = $1 AND b.blocked_id = u.id)
           OR (b.blocker_id = u.id AND b.blocked_id = $1)
      )
      AND NOT EXISTS (
        SELECT 1
        FROM video_calls vc
        WHERE (vc.caller_id = u.id OR vc.receiver_id = u.id)
          AND vc.status = 'connected'
          AND vc.ended_at IS NULL
      )
    ORDER BY RANDOM()
    LIMIT 1
    `,
    [userId, seenUserIds, applyGenderFilter, targetGenders]
  );

  return result.rows[0] || null;
}

async function hydrateDiscoveryUser(user) {
  const [photos, prompts, interests] = await Promise.all([
    pool.query('SELECT url FROM photos WHERE user_id = $1 ORDER BY order_index', [user.id]),
    pool.query('SELECT question, answer FROM prompts WHERE user_id = $1 ORDER BY order_index', [user.id]),
    pool.query('SELECT label FROM interests WHERE user_id = $1', [user.id]),
  ]);

  const profile = {
    ...user,
    bio: user.about || null,
    photos: photos.rows.map((photo) => photo.url),
    prompts: prompts.rows,
    interests: interests.rows.map((interest) => interest.label),
  };

  profile.avatarUrl = profile.photos[0] || null;

  if (!profile.gender_visible) {
    profile.gender = null;
  }
  if (profile.show_location === false) {
    profile.location = null;
  }

  delete profile.gender_visible;
  delete profile.show_location;

  return profile;
}

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const userId = auth.userId;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const selfResult = await client.query(
      `
      SELECT email_verified, onboarding_completed, suspension_until, gender
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (!selfResult.rows.length) {
      await client.query('ROLLBACK');
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const selfUser = selfResult.rows[0];
    if (!selfUser.email_verified) {
      await client.query('ROLLBACK');
      return Response.json(
        { error: 'Please verify your email before using discovery.' },
        { status: 403 }
      );
    }
    if (!selfUser.onboarding_completed || !normalizeGender(selfUser.gender)) {
      await client.query('ROLLBACK');
      return Response.json(
        { error: 'Please complete onboarding before using discovery.', onboardingRequired: true },
        { status: 403 }
      );
    }
    if (isSuspendedUntil(selfUser.suspension_until)) {
      await client.query('ROLLBACK');
      return Response.json(
        { error: 'Your discovery access is temporarily suspended.', suspensionUntil: selfUser.suspension_until },
        { status: 403 }
      );
    }

    await client.query(
      `
      INSERT INTO user_presence (user_id, online, show_status, updated_at)
      VALUES ($1, TRUE, TRUE, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET online = TRUE, show_status = COALESCE(user_presence.show_status, TRUE), updated_at = NOW()
      `,
      [userId]
    );

    await client.query(
      `DELETE FROM discovery_sessions WHERE last_refreshed < NOW() - INTERVAL '${STALE_SESSION_INTERVAL}'`
    );

    await client.query(
      `
      INSERT INTO discovery_sessions (user_id, rotation_count, seen_user_ids)
      VALUES ($1, 0, '{}')
      ON CONFLICT (user_id) DO NOTHING
      `,
      [userId]
    );

    const discoverySessionResult = await client.query(
      `
      SELECT rotation_count, seen_user_ids
      FROM discovery_sessions
      WHERE user_id = $1
      FOR UPDATE
      `,
      [userId]
    );

    const discoverySession = discoverySessionResult.rows[0] || {
      rotation_count: 0,
      seen_user_ids: [],
    };

    const rotationSlot = Number(discoverySession.rotation_count || 0);
    const seenUserIds = Array.isArray(discoverySession.seen_user_ids)
      ? discoverySession.seen_user_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : [];

    const targetGenders = resolveTargetGenders(selfUser.gender, rotationSlot < 2);

    let effectiveSeenUserIds = seenUserIds;
    let candidate = await findCandidate(client, {
      userId,
      seenUserIds: effectiveSeenUserIds,
      targetGenders,
    });
    let usedFallback = false;
    let poolReset = false;

    if (!candidate) {
      candidate = await findCandidate(client, {
        userId,
        seenUserIds: effectiveSeenUserIds,
      });
      usedFallback = Boolean(candidate);
    }

    if (!candidate) {
      poolReset = seenUserIds.length > 0;
      effectiveSeenUserIds = [];

      await client.query(
        `
        UPDATE discovery_sessions
        SET seen_user_ids = '{}',
            last_refreshed = NOW()
        WHERE user_id = $1
        `,
        [userId]
      );

      candidate = await findCandidate(client, {
        userId,
        seenUserIds: effectiveSeenUserIds,
        targetGenders,
      });

      if (!candidate) {
        candidate = await findCandidate(client, {
          userId,
          seenUserIds: effectiveSeenUserIds,
        });
        usedFallback = Boolean(candidate);
      }
    }

    if (!candidate) {
      await client.query(
        `
        UPDATE discovery_sessions
        SET last_refreshed = NOW()
        WHERE user_id = $1
        `,
        [userId]
      );
      await client.query('COMMIT');

      return Response.json({
        empty: true,
        rotationSlot,
        targetGenders,
        poolReset,
        message: poolReset
          ? 'Discovery pool reset, but no eligible users are available right now.'
          : 'No eligible users are available right now.',
      });
    }

    const nextRotationSlot = (rotationSlot + 1) % 3;
    const nextSeenUserIds = [...effectiveSeenUserIds, Number(candidate.id)];

    await client.query(
      `
      UPDATE discovery_sessions
      SET rotation_count = $1,
          seen_user_ids = $2::INTEGER[],
          last_refreshed = NOW()
      WHERE user_id = $3
      `,
      [nextRotationSlot, nextSeenUserIds, userId]
    );

    await client.query('COMMIT');

    const hydratedUser = await hydrateDiscoveryUser(candidate);

    return Response.json({
      user: hydratedUser,
      rotationSlot,
      nextRotationSlot,
      targetGenders,
      usedFallback,
      poolReset,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    console.error('Discovery next error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
