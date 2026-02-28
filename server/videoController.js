/**
 * Video call records: create and update attempts for analytics and failure logging.
 * Used by the video signaling socket handler.
 */
const pool = require('../src/lib/db');

const STATUS = {
  PENDING: 'pending',
  FAILED: 'failed',
  CONNECTED: 'connected',
  REJECTED: 'rejected',
  TIMEOUT: 'timeout',
};

/**
 * Create a new call attempt when caller sends call-request.
 * @returns {{ id: number } | null}
 */
async function createCallAttempt(callerId, receiverId) {
  const result = await pool.query(
    `INSERT INTO video_calls (caller_id, receiver_id, status)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [callerId, receiverId, STATUS.PENDING]
  );
  return result.rows[0] ? { id: result.rows[0].id } : null;
}

/**
 * Update call status and optionally set connected_at or ended_at.
 * failureReason: 'ice_failure' | 'timeout' | 'rejected' | null
 */
async function updateCallStatus(
  callId,
  status,
  { setConnectedAt = false, setEndedAt = false, failureReason = null, onlyIfNotEnded = false } = {}
) {
  const updates = ['status = $2'];
  const values = [callId, status];
  let i = 3;
  if (setConnectedAt) {
    updates.push(`connected_at = COALESCE(connected_at, NOW())`);
  }
  if (setEndedAt) {
    updates.push(`ended_at = COALESCE(ended_at, NOW())`);
  }
  if (failureReason) {
    updates.push(`failure_reason = $${i}`);
    values.push(failureReason);
    i += 1;
  }
  const where = onlyIfNotEnded ? 'WHERE id = $1 AND ended_at IS NULL' : 'WHERE id = $1';
  const result = await pool.query(
    `UPDATE video_calls SET ${updates.join(', ')} ${where}`,
    values
  );
  return result.rowCount;
}

module.exports = {
  STATUS,
  createCallAttempt,
  updateCallStatus,
};
