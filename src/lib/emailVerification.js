const crypto = require('crypto');
const pool = require('./db');

const TOKEN_TTL_MINUTES = 60;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function issueEmailVerificationToken(userId) {
  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);

  await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1 AND used_at IS NULL', [userId]);
  await pool.query(
    `
    INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, NOW() + ($3::text || ' minutes')::interval)
    `,
    [userId, tokenHash, TOKEN_TTL_MINUTES]
  );

  return rawToken;
}

async function verifyEmailToken(rawToken) {
  const tokenHash = hashToken(rawToken);

  const found = await pool.query(
    `
    SELECT evt.id AS token_id, evt.user_id, u.email, u.name, u.age, u.location, u.created_at
    FROM email_verification_tokens evt
    INNER JOIN users u ON u.id = evt.user_id
    WHERE evt.token_hash = $1
      AND evt.used_at IS NULL
      AND evt.expires_at > NOW()
    ORDER BY evt.created_at DESC
    LIMIT 1
    `,
    [tokenHash]
  );

  if (!found.rows.length) return null;
  const row = found.rows[0];

  await pool.query('BEGIN');
  try {
    const markUsed = await pool.query(
      `
      UPDATE email_verification_tokens
      SET used_at = NOW()
      WHERE id = $1
        AND used_at IS NULL
      `,
      [row.token_id]
    );

    if (markUsed.rowCount === 0) {
      await pool.query('ROLLBACK');
      return null;
    }

    await pool.query(
      `
      UPDATE users
      SET email_verified = TRUE,
          email_verified_at = NOW()
      WHERE id = $1
      `,
      [row.user_id]
    );

    await pool.query(
      `
      DELETE FROM email_verification_tokens
      WHERE user_id = $1
        AND used_at IS NULL
      `,
      [row.user_id]
    );

    await pool.query('COMMIT');
    return {
      id: row.user_id,
      email: row.email,
      name: row.name,
      age: row.age,
      location: row.location,
      created_at: row.created_at,
    };
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

module.exports = {
  issueEmailVerificationToken,
  verifyEmailToken,
};
