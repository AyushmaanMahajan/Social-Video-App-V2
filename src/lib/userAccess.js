const pool = require('./db');

function isSuspendedUntil(suspensionUntil) {
  if (!suspensionUntil) return false;
  const until = new Date(suspensionUntil);
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() > Date.now();
}

async function getUserAccessState(userId) {
  const result = await pool.query(
    `
    SELECT id, email_verified, onboarding_completed, suspension_until
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [userId]
  );

  if (!result.rows.length) return null;
  return result.rows[0];
}

async function getBlockStatus(userId, otherUserId) {
  const result = await pool.query(
    `
    SELECT blocker_id, blocked_id
    FROM blocks
    WHERE (blocker_id = $1 AND blocked_id = $2)
       OR (blocker_id = $2 AND blocked_id = $1)
    LIMIT 1
    `,
    [userId, otherUserId]
  );

  return result.rows[0] || null;
}

async function isBlockedEitherDirection(userId, otherUserId) {
  const row = await getBlockStatus(userId, otherUserId);
  return Boolean(row);
}

module.exports = {
  getBlockStatus,
  getUserAccessState,
  isBlockedEitherDirection,
  isSuspendedUntil,
};
