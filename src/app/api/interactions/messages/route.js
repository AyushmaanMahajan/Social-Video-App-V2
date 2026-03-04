import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { isBlockedEitherDirection } from '@/lib/userAccess';

async function isMutualEnabled(userId, targetUserId) {
  const res = await pool.query(
    `
    SELECT
      EXISTS(SELECT 1 FROM interaction_chat_settings WHERE user_id = $1 AND target_user_id = $2 AND enabled = true) as me_enabled,
      EXISTS(SELECT 1 FROM interaction_chat_settings WHERE user_id = $2 AND target_user_id = $1 AND enabled = true) as them_enabled
    `,
    [userId, targetUserId]
  );
  const row = res.rows[0] || { me_enabled: false, them_enabled: false };
  return Boolean(row.me_enabled && row.them_enabled);
}

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  const { searchParams } = new URL(request.url);
  const targetUserId = Number(searchParams.get('targetUserId'));
  const encounterIdRaw = searchParams.get('encounterId');
  const encounterId = encounterIdRaw ? Number(encounterIdRaw) : null;

  if (!targetUserId) {
    return Response.json({ error: 'targetUserId required' }, { status: 400 });
  }

  try {
    if (await isBlockedEitherDirection(auth.userId, targetUserId)) {
      return Response.json({ error: 'Chat is unavailable for this user.' }, { status: 403 });
    }

    const params = encounterId ? [auth.userId, targetUserId, encounterId] : [auth.userId, targetUserId];
    const encounterClause = encounterId ? 'AND encounter_id = $3' : '';
    const res = await pool.query(
      `
      SELECT id, sender_id, receiver_id, encounter_id, message_text, created_at
      FROM encounter_messages
      WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
      ${encounterClause}
      ORDER BY created_at ASC
      `,
      params
    );
    return Response.json({ messages: res.rows });
  } catch (error) {
    console.error('Messages fetch error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  try {
    const body = await request.json();
    const { targetUserId, message, encounterId } = body || {};
    if (!targetUserId || !message || typeof message !== 'string') {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const normalizedMessage = message.trim();
    if (!normalizedMessage) {
      return Response.json({ error: 'Message required' }, { status: 400 });
    }

    const target = Number(targetUserId);
    if (await isBlockedEitherDirection(auth.userId, target)) {
      return Response.json({ error: 'Chat is unavailable for this user.' }, { status: 403 });
    }

    if (!(await isMutualEnabled(auth.userId, target))) {
      return Response.json({ error: 'Chat not unlocked' }, { status: 403 });
    }

    const res = await pool.query(
      `
      INSERT INTO encounter_messages (sender_id, receiver_id, encounter_id, message_text)
      VALUES ($1, $2, $3, $4)
      RETURNING id, sender_id, receiver_id, encounter_id, message_text, created_at
      `,
      [auth.userId, target, encounterId || null, normalizedMessage]
    );

    return Response.json({ message: res.rows[0] });
  } catch (error) {
    console.error('Messages create error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
