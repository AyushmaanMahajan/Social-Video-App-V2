import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { isBlockedEitherDirection } from '@/lib/userAccess';

export async function GET(request, { params }) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;
  const userId = auth.userId;
  const targetUserId = Number(params.targetId);

  if (!targetUserId) {
    return Response.json({ error: 'Invalid target' }, { status: 400 });
  }

  try {
    if (await isBlockedEitherDirection(userId, targetUserId)) {
      return Response.json({ meEnabled: false, themEnabled: false, mutual: false, blocked: true });
    }

    const res = await pool.query(
      `
      SELECT
        EXISTS(SELECT 1 FROM interaction_chat_settings WHERE user_id = $1 AND target_user_id = $2 AND enabled = true) as me_enabled,
        EXISTS(SELECT 1 FROM interaction_chat_settings WHERE user_id = $2 AND target_user_id = $1 AND enabled = true) as them_enabled
      `,
      [userId, targetUserId]
    );
    const row = res.rows[0] || { me_enabled: false, them_enabled: false };
    return Response.json({
      meEnabled: row.me_enabled,
      themEnabled: row.them_enabled,
      mutual: row.me_enabled && row.them_enabled,
    });
  } catch (error) {
    console.error('Chat status error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
