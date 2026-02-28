const MAX_EVENTS = 500;
const recentEvents = [];
const callStages = new Map();

function nowIso() {
  return new Date().toISOString();
}

function pushEvent(event) {
  recentEvents.push(event);
  if (recentEvents.length > MAX_EVENTS) {
    recentEvents.shift();
  }
}

function upsertCallStage(callId, stageData) {
  if (!callId) return;
  const key = String(callId);
  const current = callStages.get(key) || {};
  callStages.set(key, { ...current, ...stageData, updatedAt: nowIso() });
}

function logVideoStage({
  stage,
  status = 'info',
  message = '',
  callId = null,
  userId = null,
  peerId = null,
  socketId = null,
  meta = null,
} = {}) {
  const event = {
    at: nowIso(),
    stage,
    status,
    message,
    callId,
    userId,
    peerId,
    socketId,
    meta,
  };
  pushEvent(event);

  if (callId) {
    upsertCallStage(callId, {
      [`${stage}Status`]: status,
      [`${stage}Message`]: message,
      userId,
      peerId,
    });
  }

  const prefix = `[video:${stage}:${status}]`;
  if (meta) {
    console.log(prefix, message, { callId, userId, peerId, socketId, meta });
  } else {
    console.log(prefix, message, { callId, userId, peerId, socketId });
  }
}

function getVideoDiagnosticsReport() {
  const calls = Array.from(callStages.entries()).map(([callId, data]) => {
    const stageKeys = Object.keys(data).filter((k) => k.endsWith('Status'));
    const failedStage = stageKeys
      .map((k) => ({ stage: k.replace(/Status$/, ''), status: data[k] }))
      .find((v) => v.status === 'fail');
    return {
      callId,
      ...data,
      failedStage: failedStage ? failedStage.stage : null,
    };
  });

  return {
    generatedAt: nowIso(),
    callCount: calls.length,
    recentEvents: [...recentEvents],
    calls,
  };
}

module.exports = {
  logVideoStage,
  getVideoDiagnosticsReport,
};
