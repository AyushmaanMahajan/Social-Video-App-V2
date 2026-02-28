/**
 * Socket.io signaling namespace for video calls.
 * Verifies mutual match, prevents multiple simultaneous calls, relays WebRTC signaling.
 */
const jwt = require('jsonwebtoken');
const pool = require('../src/lib/db');
const { createCallAttempt, updateCallStatus, STATUS } = require('./videoController');
const { logVideoStage } = require('./videoDiagnostics');

const VIDEO_NAMESPACE = '/video';
const CALL_TIMEOUT_MS = 45 * 1000;
const ENCOUNTER_TIMEOUT_MS = 30 * 1000;

/** In-memory: userId -> { peerId, callId, timeoutId } */
const userInCall = new Map();

/** Socket id -> userId for lookup */
const socketToUserId = new Map();

/** userId -> Set<socketId> */
const userSockets = new Map();

/** Encounter presence: userId -> { requestedUserId, ready, timer, socketId } */
const userInEncounter = new Map();
/** Pair keys currently being matched to avoid duplicate call creation */
const matchingEncounterPairs = new Set();

function addUserSocket(userId, socketId) {
  const numericUserId = Number(userId);
  const current = userSockets.get(numericUserId) || new Set();
  current.add(socketId);
  userSockets.set(numericUserId, current);
}

function removeUserSocket(userId, socketId) {
  const numericUserId = Number(userId);
  const current = userSockets.get(numericUserId);
  if (!current) return 0;
  current.delete(socketId);
  if (current.size === 0) {
    userSockets.delete(numericUserId);
    return 0;
  }
  userSockets.set(numericUserId, current);
  return current.size;
}

function getUserId(socket) {
  const token = socket.handshake.auth?.token;
  if (!token) return { userId: null, reason: 'missing_token' };
  if (!process.env.JWT_SECRET) return { userId: null, reason: 'missing_jwt_secret' };
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { userId: decoded.userId, reason: 'ok' };
  } catch (error) {
    return { userId: null, reason: error?.message || 'invalid_token' };
  }
}

function clearEncounterState(userId) {
  const state = userInEncounter.get(userId);
  if (state?.timer) clearTimeout(state.timer);
  userInEncounter.delete(userId);
}

function clearCallTimeoutForUser(userId) {
  const numericUserId = Number(userId);
  const current = userInCall.get(numericUserId);
  if (!current) return;
  if (current.timeoutId) clearTimeout(current.timeoutId);
  if (current.timeoutId !== null) {
    userInCall.set(numericUserId, { ...current, timeoutId: null });
  }
}

function clearCallTimeoutForPair(userAId, userBId) {
  clearCallTimeoutForUser(userAId);
  clearCallTimeoutForUser(userBId);
}

function clearCallStateForUser(userId) {
  const numericUserId = Number(userId);
  const current = userInCall.get(numericUserId);
  if (current?.timeoutId) clearTimeout(current.timeoutId);
  userInCall.delete(numericUserId);
}

function clearCallStateForPair(userAId, userBId) {
  clearCallStateForUser(userAId);
  clearCallStateForUser(userBId);
}

function startCallTimeout(videoNs, userAId, userBId, callId) {
  const numericUserA = Number(userAId);
  const numericUserB = Number(userBId);
  const timeoutId = setTimeout(async () => {
    try {
      const stateA = userInCall.get(numericUserA);
      const stateB = userInCall.get(numericUserB);
      const isStillActive =
        (stateA && stateA.callId === callId) ||
        (stateB && stateB.callId === callId);
      if (!isStillActive) return;

      clearCallStateForPair(numericUserA, numericUserB);
      await updateCallStatus(callId, STATUS.TIMEOUT, {
        setEndedAt: true,
        failureReason: 'timeout',
        onlyIfNotEnded: true,
      });
      await upsertInteractionStatus(numericUserA, numericUserB, 'timeout');
      logVideoStage({
        stage: 'call-timeout',
        status: 'fail',
        message: 'Call timed out before ICE connected.',
        userId: numericUserA,
        peerId: numericUserB,
        callId,
      });
      videoNs.to(`user:${numericUserA}`).emit('call-ended', { callId, reason: 'timeout' });
      videoNs.to(`user:${numericUserB}`).emit('call-ended', { callId, reason: 'timeout' });
    } catch (error) {
      logVideoStage({
        stage: 'call-timeout',
        status: 'fail',
        message: 'Error while processing call timeout.',
        userId: numericUserA,
        peerId: numericUserB,
        callId,
        meta: { message: error?.message || 'unknown_error' },
      });
    }
  }, CALL_TIMEOUT_MS);

  const stateA = userInCall.get(numericUserA);
  if (stateA && stateA.callId === callId) {
    userInCall.set(numericUserA, { ...stateA, timeoutId });
  }
  const stateB = userInCall.get(numericUserB);
  if (stateB && stateB.callId === callId) {
    userInCall.set(numericUserB, { ...stateB, timeoutId });
  }
}

function normalizePair(a, b) {
  const userA = Math.min(Number(a), Number(b));
  const userB = Math.max(Number(a), Number(b));
  return [userA, userB];
}

function pairKey(a, b) {
  const [userA, userB] = normalizePair(a, b);
  return `${userA}:${userB}`;
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

async function persistEncounterMessage(senderId, receiverId, encounterId, messageText) {
  const res = await pool.query(
    `
    INSERT INTO encounter_messages (sender_id, receiver_id, encounter_id, message_text)
    VALUES ($1, $2, $3, $4)
    RETURNING id, created_at
    `,
    [senderId, receiverId, encounterId || null, messageText]
  );
  return res.rows[0] || null;
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
  const key = pairKey(userAId, userBId);
  if (matchingEncounterPairs.has(key)) return;
  matchingEncounterPairs.add(key);

  try {
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
    startCallTimeout(videoNs, userAId, userBId, callRecord.id);

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
  } finally {
    matchingEncounterPairs.delete(key);
  }
}

function registerVideoNamespace(io) {
  const videoNs = io.of(VIDEO_NAMESPACE);

  videoNs.use((socket, next) => {
    const auth = getUserId(socket);
    if (!auth.userId) {
      logVideoStage({
        stage: 'jwt_verification',
        status: 'fail',
        message: `Socket auth failed: ${auth.reason}`,
        socketId: socket.id,
      });
      logVideoStage({
        stage: 'socket_handshake',
        status: 'fail',
        message: 'Socket handshake failed.',
        socketId: socket.id,
      });
      return next(new Error('Unauthorized'));
    }
    socket.userId = auth.userId;
    socketToUserId.set(socket.id, auth.userId);
    logVideoStage({
      stage: 'jwt_verification',
      status: 'ok',
      message: 'Socket JWT verified.',
      socketId: socket.id,
      userId: auth.userId,
    });
    logVideoStage({
      stage: 'socket_handshake',
      status: 'ok',
      message: 'Socket handshake succeeded.',
      socketId: socket.id,
      userId: auth.userId,
    });
    next();
  });

  videoNs.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);
    addUserSocket(userId, socket.id);
    logVideoStage({
      stage: 'socket_presence',
      status: 'info',
      message: 'Socket connected for user presence.',
      socketId: socket.id,
      userId,
      meta: { activeSockets: userSockets.get(Number(userId))?.size || 0 },
    });

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
      logVideoStage({
        stage: 'call-request',
        status: 'ok',
        message: 'Encounter request received.',
        socketId: socket.id,
        userId,
        peerId: Number(targetUserId),
      });

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
      logVideoStage({
        stage: 'call-request',
        status: 'fail',
        message: 'Direct call-request received but feature is disabled.',
        socketId: socket.id,
        userId,
      });
      socket.emit('error', { message: 'Direct calls are disabled. Use Encounter.' });
    });

    socket.on('call-accept', async (payload) => {
      const { callId, callerId } = payload || {};
      if (!callId || !callerId) return socket.emit('error', { message: 'callId and callerId required' });
      logVideoStage({
        stage: 'call-accept',
        status: 'ok',
        message: 'call-accept received.',
        socketId: socket.id,
        userId,
        peerId: Number(callerId),
        callId,
      });

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

      videoNs.to(`user:${callerId}`).emit('call-accepted', { callId, receiverId: userId });
      socket.emit('call-accepted', { callId });
      logVideoStage({
        stage: 'call-accept',
        status: 'ok',
        message: 'call-accept completed.',
        socketId: socket.id,
        userId,
        peerId: Number(callerId),
        callId,
      });
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
      const activeCallId = my.callId;
      clearCallStateForPair(userId, peerId);
      await updateCallStatus(activeCallId, STATUS.FAILED, {
        setEndedAt: true,
        failureReason: 'disconnected',
        onlyIfNotEnded: true,
      });
      logVideoStage({
        stage: 'disconnect-call',
        status: 'ok',
        message: 'disconnect-call handled.',
        socketId: socket.id,
        userId,
        peerId: Number(peerId),
        callId: activeCallId,
        meta: { requestedCallId: callId || null },
      });
      videoNs.to(`user:${peerId}`).emit('call-ended', { callId: activeCallId, reason: 'disconnected' });
      socket.emit('call-ended', { callId: activeCallId, reason: 'disconnected' });
    });

    socket.on('call-connected-confirmed', async () => {
      const my = userInCall.get(userId);
      if (!my) {
        logVideoStage({
          stage: 'call-connected-confirmed',
          status: 'fail',
          message: 'call-connected-confirmed ignored; no active call session.',
          socketId: socket.id,
          userId,
        });
        return;
      }

      clearCallTimeoutForPair(userId, my.peerId);
      const updated = await updateCallStatus(my.callId, STATUS.CONNECTED, {
        setConnectedAt: true,
        onlyIfNotEnded: true,
      });
      if (updated > 0) {
        await upsertInteractionStatus(userId, my.peerId, 'connected');
      }

      logVideoStage({
        stage: 'call-connected-confirmed',
        status: updated > 0 ? 'ok' : 'fail',
        message: updated > 0 ? 'Call marked connected after ICE confirmation.' : 'Call confirmation skipped; call already ended.',
        socketId: socket.id,
        userId,
        peerId: Number(my.peerId),
        callId: my.callId,
      });
    });

    // WebRTC signaling relay
    socket.on('webrtc-offer', (payload) => {
      const my = userInCall.get(userId);
      if (!my) return;
      logVideoStage({
        stage: 'webrtc_offer',
        status: 'ok',
        message: 'Server relayed webrtc-offer.',
        socketId: socket.id,
        userId,
        peerId: Number(my.peerId),
        callId: my.callId,
      });
      videoNs.to(`user:${my.peerId}`).emit('webrtc-offer', payload);
    });
    socket.on('webrtc-answer', (payload) => {
      const my = userInCall.get(userId);
      if (!my) return;
      logVideoStage({
        stage: 'webrtc_answer',
        status: 'ok',
        message: 'Server relayed webrtc-answer.',
        socketId: socket.id,
        userId,
        peerId: Number(my.peerId),
        callId: my.callId,
      });
      videoNs.to(`user:${my.peerId}`).emit('webrtc-answer', payload);
    });
    socket.on('webrtc-ice', (payload) => {
      const my = userInCall.get(userId);
      if (!my) return;
      logVideoStage({
        stage: 'ice_candidate',
        status: 'ok',
        message: 'Server relayed ICE candidate.',
        socketId: socket.id,
        userId,
        peerId: Number(my.peerId),
        callId: my.callId,
      });
      videoNs.to(`user:${my.peerId}`).emit('webrtc-ice', payload);
    });

    socket.on('client-diagnostic', (payload) => {
      const my = userInCall.get(userId);
      logVideoStage({
        stage: payload?.stage || 'client_event',
        status: payload?.status || 'info',
        message: payload?.message || 'Client diagnostic event',
        socketId: socket.id,
        userId,
        peerId: my ? Number(my.peerId) : null,
        callId: payload?.callId || (my ? my.callId : null),
        meta: payload?.meta || null,
      });
    });

    socket.on('chat-message', async (payload) => {
      const { targetUserId, text, encounterId } = payload || {};
      if (!targetUserId || typeof text !== 'string') return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const numericTarget = Number(targetUserId);
      const normalizedEncounterId =
        encounterId !== undefined && encounterId !== null && Number.isFinite(Number(encounterId))
          ? Number(encounterId)
          : null;
      const allowed = await isChatMutual(userId, numericTarget);
      if (!allowed) {
        return socket.emit('chat-locked', { peerId: numericTarget });
      }
      let saved = null;
      try {
        saved = await persistEncounterMessage(userId, numericTarget, normalizedEncounterId, trimmed);
      } catch (e) {
        console.error('chat-message persist error', e);
      }
      const outbound = {
        id: saved?.id || null,
        fromUserId: userId,
        toUserId: numericTarget,
        text: trimmed,
        encounterId: normalizedEncounterId,
        createdAt: saved?.created_at || new Date().toISOString(),
      };
      videoNs.to(`user:${numericTarget}`).emit('chat-message', outbound);
      socket.emit('chat-message', outbound);
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
        logVideoStage({
          stage: 'ice_state',
          status: 'fail',
          message: 'ICE failure reported by client.',
          socketId: socket.id,
          userId,
          peerId: Number(my.peerId),
          callId: my.callId,
          meta: payload || null,
        });
        await updateCallStatus(my.callId, STATUS.FAILED, {
          setEndedAt: true,
          failureReason: 'ice_failure',
          onlyIfNotEnded: true,
        });
        clearCallStateForPair(userId, my.peerId);
        videoNs.to(`user:${my.peerId}`).emit('call-ended', { callId: my.callId, reason: 'ice_failure' });
        socket.emit('call-ended', { callId: my.callId, reason: 'ice_failure' });
      }
    });

    socket.on('disconnect', () => {
      socketToUserId.delete(socket.id);
      const remainingSockets = removeUserSocket(userId, socket.id);
      logVideoStage({
        stage: 'socket_presence',
        status: 'info',
        message: 'Socket disconnected for user presence.',
        socketId: socket.id,
        userId,
        meta: { activeSockets: remainingSockets },
      });
      if (remainingSockets > 0) return;
      const my = userInCall.get(userId);
      if (my) {
        clearCallStateForPair(userId, my.peerId);
        updateCallStatus(my.callId, STATUS.FAILED, {
          setEndedAt: true,
          failureReason: 'disconnected',
          onlyIfNotEnded: true,
        }).catch(() => {});
        videoNs.to(`user:${my.peerId}`).emit('call-ended', { callId: my.callId, reason: 'disconnected' });
      }
      clearEncounterState(userId);
    });
  });

  return VIDEO_NAMESPACE;
}

module.exports = { registerVideoNamespace, VIDEO_NAMESPACE };
