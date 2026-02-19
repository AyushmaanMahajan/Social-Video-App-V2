/**
 * Socket.io signaling namespace for video calls.
 * Verifies mutual match, prevents multiple simultaneous calls, relays WebRTC signaling.
 */
const jwt = require('jsonwebtoken');
const pool = require('../src/lib/db');
const { createCallAttempt, updateCallStatus, STATUS } = require('./videoController');

const VIDEO_NAMESPACE = '/video';
const CALL_TIMEOUT_MS = 45 * 1000;
const ENCOUNTER_TIMEOUT_MS = 30 * 1000;

/** In-memory: userId -> { peerId, callId, timeoutId } */
const userInCall = new Map();

/** Socket id -> userId for lookup */
const socketToUserId = new Map();

/** Encounter presence: userId -> { requestedUserId, ready, timer, socketId } */
const userInEncounter = new Map();

function getUserId(socket) {
  const token = socket.handshake.auth?.token;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
}

function clearEncounterState(userId) {
  const state = userInEncounter.get(userId);
  if (state?.timer) clearTimeout(state.timer);
  userInEncounter.delete(userId);
}

function normalizePair(a, b) {
  const userA = Math.min(Number(a), Number(b));
  const userB = Math.max(Number(a), Number(b));
  return [userA, userB];
}

async function upsertInteractionStatus(userAId, userBId, status) {
  const [userA, userB] = normalizePair(userAId, userBId);
  try {
    await pool.query(
      `
      INSERT INTO interactions (user_a, user_b, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_a, user_b)
      DO UPDATE SET status = EXCLUDED.status, last_interaction_at = NOW()
      `,
      [userA, userB, status]
    );
  } catch (e) {
    console.error('interaction upsert error', e);
  }
}

async function isChatMutual(userId, targetUserId) {
  const res = await pool.query(
    `
    SELECT
      EXISTS(SELECT 1 FROM interaction_chat_settings WHERE user_id = $1 AND target_user_id = $2 AND enabled = true) as me_enabled,
      EXISTS(SELECT 1 FROM interaction_chat_settings WHERE user_id = $2 AND target_user_id = $1 AND enabled = true) as them_enabled
    `,
    [userId, targetUserId]
  );
  const row = res.rows[0] || { me_enabled: false, them_enabled: false };
  return row.me_enabled && row.them_enabled;
}

async function getUserNames(userIds = []) {
  if (!userIds.length) return new Map();
  const res = await pool.query('SELECT id, name FROM users WHERE id = ANY($1)', [userIds]);
  const map = new Map();
  res.rows.forEach((row) => {
    map.set(Number(row.id), row.name || 'Someone');
  });
  return map;
}

async function emitEncounterMatch(videoNs, userAId, userBId) {
  if (userInCall.has(userAId) || userInCall.has(userBId)) return;

  let callRecord;
  try {
    callRecord = await createCallAttempt(userAId, userBId);
  } catch (e) {
    console.error('video_calls create (encounter) error', e);
    return;
  }
  if (!callRecord) return;

  userInCall.set(userAId, { peerId: userBId, callId: callRecord.id, timeoutId: null });
  userInCall.set(userBId, { peerId: userAId, callId: callRecord.id, timeoutId: null });
  await updateCallStatus(callRecord.id, STATUS.CONNECTED, { setConnectedAt: true });
  await upsertInteractionStatus(userAId, userBId, 'connected');

  const names = await getUserNames([userAId, userBId]);
  const offererIsA = userAId < userBId;

  videoNs.to(`user:${userAId}`).emit('encounter-match', {
    callId: callRecord.id,
    peerId: userBId,
    peerName: names.get(userBId) || 'Someone',
    shouldOffer: offererIsA,
  });
  videoNs.to(`user:${userBId}`).emit('encounter-match', {
    callId: callRecord.id,
    peerId: userAId,
    peerName: names.get(userAId) || 'Someone',
    shouldOffer: !offererIsA,
  });

  clearEncounterState(userAId);
  clearEncounterState(userBId);
}

function registerVideoNamespace(io) {
  const videoNs = io.of(VIDEO_NAMESPACE);

  videoNs.use((socket, next) => {
    const userId = getUserId(socket);
    if (!userId) return next(new Error('Unauthorized'));
    socket.userId = userId;
    socketToUserId.set(socket.id, userId);
    next();
  });

  videoNs.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);

    socket.on('encounter-ready', () => {
      if (userInCall.has(userId)) {
        return socket.emit('error', { message: 'Already in a call' });
      }
      const current = userInEncounter.get(userId);
      if (current?.timer) clearTimeout(current.timer);
      userInEncounter.set(userId, { requestedUserId: null, ready: true, timer: null, socketId: socket.id });
      socket.emit('encounter-ready-ack', {});
    });

    socket.on('encounter-exit', () => {
      clearEncounterState(userId);
    });

    socket.on('encounter-request', async (payload) => {
      const { targetUserId } = payload || {};
      if (!targetUserId) return socket.emit('error', { message: 'targetUserId required' });

      if (userInCall.has(userId)) {
        return socket.emit('encounter-timeout', { reason: 'already_in_call' });
      }
      if (userInCall.has(Number(targetUserId))) {
        return socket.emit('encounter-timeout', { reason: 'target_in_call' });
      }

      const state = userInEncounter.get(userId) || { requestedUserId: null, ready: true, timer: null, socketId: socket.id };
      if (state.timer) clearTimeout(state.timer);
      state.ready = true;
      state.requestedUserId = Number(targetUserId);
      state.timer = setTimeout(() => {
        clearEncounterState(userId);
      socket.emit('encounter-timeout', { reason: 'no_mutual' });
        if (state.requestedUserId) {
          upsertInteractionStatus(userId, state.requestedUserId, 'timeout');
        }
      }, ENCOUNTER_TIMEOUT_MS);
      userInEncounter.set(userId, state);

      const other = userInEncounter.get(Number(targetUserId));
      const mutual = other && other.ready && other.requestedUserId === userId;
      if (mutual) {
        await emitEncounterMatch(videoNs, userId, Number(targetUserId));
      }
    });

    socket.on('call-request', () => {
      socket.emit('error', { message: 'Direct calls are disabled. Use Encounter.' });
    });

    socket.on('call-accept', async (payload) => {
      const { callId, callerId } = payload || {};
      if (!callId || !callerId) return socket.emit('error', { message: 'callId and callerId required' });

      if (userInCall.has(userId)) {
        return socket.emit('error', { message: 'Already in a call' });
      }

      const callerData = userInCall.get(Number(callerId));
      if (!callerData || callerData.callId !== callId) {
        return socket.emit('call-rejected', { reason: 'Call no longer valid' });
      }

      clearTimeout(callerData.timeoutId);
      callerData.timeoutId = null;
      userInCall.set(Number(callerId), { ...callerData, peerId: userId });
      userInCall.set(userId, { peerId: callerId, callId, timeoutId: null });

      await updateCallStatus(callId, STATUS.CONNECTED, { setConnectedAt: true });
      await upsertInteractionStatus(userId, callerId, 'connected');

      videoNs.to(`user:${callerId}`).emit('call-accepted', { callId, receiverId: userId });
      socket.emit('call-accepted', { callId });
    });

    socket.on('call-reject', async (payload) => {
      const { callId, callerId } = payload || {};
      if (!callId || !callerId) return;

      const callerData = userInCall.get(Number(callerId));
      if (callerData && callerData.callId === callId) {
        clearTimeout(callerData.timeoutId);
        userInCall.delete(Number(callerId));
        await updateCallStatus(callId, STATUS.REJECTED, { setEndedAt: true, failureReason: 'rejected' });
        videoNs.to(`user:${callerId}`).emit('call-rejected', { callId, reason: 'rejected' });
      }
    });

    socket.on('disconnect-call', async (payload) => {
      const { callId } = payload || {};
      const my = userInCall.get(userId);
      if (!my) return;
      const peerId = my.peerId;
      clearTimeout(my.timeoutId);
      userInCall.delete(userId);
      userInCall.delete(Number(peerId));
      await updateCallStatus(my.callId, STATUS.CONNECTED, { setEndedAt: true });
      videoNs.to(`user:${peerId}`).emit('call-ended', { callId: my.callId, reason: 'disconnected' });
      socket.emit('call-ended', { callId: my.callId });
    });

    // WebRTC signaling relay
    socket.on('webrtc-offer', (payload) => {
      const my = userInCall.get(userId);
      if (!my) return;
      videoNs.to(`user:${my.peerId}`).emit('webrtc-offer', payload);
    });
    socket.on('webrtc-answer', (payload) => {
      const my = userInCall.get(userId);
      if (!my) return;
      videoNs.to(`user:${my.peerId}`).emit('webrtc-answer', payload);
    });
    socket.on('webrtc-ice', (payload) => {
      const my = userInCall.get(userId);
      if (!my) return;
      videoNs.to(`user:${my.peerId}`).emit('webrtc-ice', payload);
    });

    socket.on('chat-message', async (payload) => {
      const { targetUserId, text } = payload || {};
      if (!targetUserId || !text) return;
      const allowed = await isChatMutual(userId, Number(targetUserId));
      if (!allowed) {
        return socket.emit('error', { message: 'Chat not unlocked' });
      }
      videoNs.to(`user:${targetUserId}`).emit('chat-message', { fromUserId: userId, text });
    });

    socket.on('chat-toggle', async (payload) => {
      const { targetUserId, enabled } = payload || {};
      if (!targetUserId || typeof enabled !== 'boolean') return;
      try {
        await pool.query(
          `
          INSERT INTO interaction_chat_settings (user_id, target_user_id, enabled)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, target_user_id)
          DO UPDATE SET enabled = EXCLUDED.enabled
          `,
          [userId, targetUserId, enabled]
        );
        const mutual = await isChatMutual(userId, Number(targetUserId));
        if (mutual) {
          videoNs.to(`user:${userId}`).emit('chat-unlocked', { peerId: Number(targetUserId) });
          videoNs.to(`user:${targetUserId}`).emit('chat-unlocked', { peerId: Number(userId) });
        }
      } catch (e) {
        console.error('chat-toggle error', e);
      }
    });

    // ICE failure reporting (for logging)
    socket.on('ice-failure', async (payload) => {
      const my = userInCall.get(userId);
      if (my) {
        await updateCallStatus(my.callId, STATUS.FAILED, { setEndedAt: true, failureReason: 'ice_failure' });
        userInCall.delete(userId);
        userInCall.delete(Number(my.peerId));
        videoNs.to(`user:${my.peerId}`).emit('call-ended', { callId: my.callId, reason: 'ice_failure' });
      }
    });

    socket.on('disconnect', () => {
      socketToUserId.delete(socket.id);
      const my = userInCall.get(userId);
      if (my) {
        clearTimeout(my.timeoutId);
        userInCall.delete(userId);
        userInCall.delete(Number(my.peerId));
        updateCallStatus(my.callId, STATUS.FAILED, { setEndedAt: true, failureReason: 'disconnected' }).catch(() => {});
        videoNs.to(`user:${my.peerId}`).emit('call-ended', { callId: my.callId, reason: 'disconnected' });
      }
      clearEncounterState(userId);
    });
  });

  return VIDEO_NAMESPACE;
}

module.exports = { registerVideoNamespace, VIDEO_NAMESPACE };
