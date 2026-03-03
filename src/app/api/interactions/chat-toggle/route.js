import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function isMutualEnabled(userId, targetUserId) {
  const res = await pool.query(
    `
    SELECT
      EXISTS(SELECT 1 FROM interaction_chat_settings WHERE user_id = $1 AND target_user_id = $2 AND enabled = true) as me_enabled,
      EXISTS(SELECT 1 FROM interaction_chat_settings WHERE user_id = $2 AND target_user_id = $1 AND enabled = true) as them_enabled
    `,
    [userId, targetUserId]
  );
  if (res.rows.length === 0) return { me: false, them: false };
  return { me: res.rows[0].me_enabled, them: res.rows[0].them_enabled };
}

export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;
  const userId = auth.userId;

  try {
    const body = await request.json();
    const { targetUserId, enabled } = body || {};
    if (!targetUserId || typeof enabled !== 'boolean') {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await pool.query(
      `
      INSERT INTO interaction_chat_settings (user_id, target_user_id, enabled)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, target_user_id)
      DO UPDATE SET enabled = EXCLUDED.enabled
      `,
      [userId, targetUserId, enabled]
    );

    const status = await isMutualEnabled(userId, targetUserId);
    return Response.json({
      enabled,
      meEnabled: Boolean(status.me),
      themEnabled: Boolean(status.them),
      mutual: Boolean(status.me && status.them),
    });
  } catch (error) {
    console.error('Chat toggle error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
