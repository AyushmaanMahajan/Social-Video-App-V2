/**
 * Socket.io signaling namespace for video calls.
 * Verifies mutual match, prevents multiple simultaneous calls, relays WebRTC signaling.
 */
const jwt = require('jsonwebtoken');
const pool = require('../src/lib/db');
const { createCallAttempt, updateCallStatus, STATUS } = require('./videoController');

const VIDEO_NAMESPACE = '/video';
const CALL_TIMEOUT_MS = 45 * 1000;

/** In-memory: userId -> { peerId, callId, timeoutId } */
const userInCall = new Map();

/** Socket id -> userId for lookup */
const socketToUserId = new Map();

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

async function isMutualMatch(userId, targetId) {
  const r = await pool.query(
    `SELECT 
      EXISTS(SELECT 1 FROM pools WHERE user_id = $1 AND added_user_id = $2) AS a,
      EXISTS(SELECT 1 FROM pools WHERE user_id = $2 AND added_user_id = $1) AS b`,
    [userId, targetId]
  );
  return r.rows[0] && r.rows[0].a && r.rows[0].b;
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

    socket.on('call-request', async (payload) => {
      const { receiverId, callerName } = payload || {};
      if (!receiverId) return socket.emit('error', { message: 'receiverId required' });

      if (userInCall.has(userId)) {
        return socket.emit('call-rejected', { reason: 'You are already in a call' });
      }

      const mutual = await isMutualMatch(userId, receiverId);
      if (!mutual) {
        return socket.emit('call-rejected', { reason: 'Not a mutual match' });
      }

      const receiverSockets = await videoNs.in(`user:${receiverId}`).fetchSockets();
      if (receiverSockets.length === 0) {
        return socket.emit('call-rejected', { reason: 'User offline' });
      }
      if (userInCall.has(Number(receiverId))) {
        return socket.emit('call-rejected', { reason: 'User is busy' });
      }

      let callRecord;
      try {
        callRecord = await createCallAttempt(userId, receiverId);
      } catch (e) {
        console.error('video_calls create error', e);
        return socket.emit('error', { message: 'Failed to create call record' });
      }

      const callId = callRecord.id;
      const timeoutId = setTimeout(async () => {
        if (!userInCall.has(userId)) return;
        userInCall.delete(userId);
        userInCall.delete(Number(receiverId));
        await updateCallStatus(callId, STATUS.TIMEOUT, { setEndedAt: true, failureReason: 'timeout' });
        socket.emit('call-timeout', { callId });
        videoNs.to(`user:${receiverId}`).emit('call-ended', { callId, reason: 'timeout' });
      }, CALL_TIMEOUT_MS);

      userInCall.set(userId, { peerId: receiverId, callId, timeoutId });

      videoNs.to(`user:${receiverId}`).emit('incoming-call', {
        callId,
        callerId: userId,
        callerName: callerName || 'Someone',
      });
      socket.emit('call-request-sent', { callId });
    });

    socket.on('call-accept', async (payload) => {
      const { callId, callerId } = payload || {};
      if (!callId || !callerId) return socket.emit('error', { message: 'callId and callerId required' });

      if (userInCall.has(userId)) {
        return socket.emit('error', { message: 'Already in a call' });
      }

      const mutual = await isMutualMatch(userId, callerId);
      if (!mutual) return socket.emit('error', { message: 'Not a mutual match' });

      const callerData = userInCall.get(Number(callerId));
      if (!callerData || callerData.callId !== callId) {
        return socket.emit('call-rejected', { reason: 'Call no longer valid' });
      }

      clearTimeout(callerData.timeoutId);
      callerData.timeoutId = null;
      userInCall.set(Number(callerId), { ...callerData, peerId: userId });
      userInCall.set(userId, { peerId: callerId, callId, timeoutId: null });

      await updateCallStatus(callId, STATUS.CONNECTED, { setConnectedAt: true });

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

    socket.on('chat-message', (payload) => {
      const my = userInCall.get(userId);
      if (!my) return;
      videoNs.to(`user:${my.peerId}`).emit('chat-message', { fromUserId: userId, text: payload?.text ?? '' });
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
    });
  });

  return VIDEO_NAMESPACE;
}

module.exports = { registerVideoNamespace, VIDEO_NAMESPACE };
