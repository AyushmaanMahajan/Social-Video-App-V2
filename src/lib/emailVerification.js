const crypto = require('crypto');
const pool = require('./db');

const TOKEN_TTL_MINUTES = 20;
const ISSUE_WINDOW_MINUTES = 30;
const MAX_TOKENS_PER_WINDOW = 4;

function getSigningSecret() {
  return process.env.EMAIL_VERIFICATION_SECRET || process.env.JWT_SECRET || '';
}

function toBase64Url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function signRawToken(rawToken) {
  const secret = getSigningSecret();
  if (!secret) return rawToken;
  const signature = toBase64Url(crypto.createHmac('sha256', secret).update(rawToken).digest());
  return `${rawToken}.${signature}`;
}

function verifySignedToken(token) {
  const value = String(token || '').trim();
  if (!value) return null;

  const secret = getSigningSecret();
  if (!secret) return value;

  const [rawToken, providedSignature] = value.split('.');
  if (!rawToken || !providedSignature) return null;

  const expectedSignature = toBase64Url(crypto.createHmac('sha256', secret).update(rawToken).digest());
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) return null;
  return rawToken;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function issueEmailVerificationToken(userId) {
  const issueWindowResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM email_verification_tokens
    WHERE user_id = $1
      AND created_at >= NOW() - ($2::text || ' minutes')::interval
    `,
    [userId, ISSUE_WINDOW_MINUTES]
  );

  const totalRecent = Number(issueWindowResult.rows[0]?.total || 0);
  if (totalRecent >= MAX_TOKENS_PER_WINDOW) {
    const error = new Error('Too many verification attempts. Please try again later.');
    error.code = 'VERIFICATION_RATE_LIMIT';
    throw error;
  }

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

  return signRawToken(rawToken);
}

async function verifyEmailToken(rawToken) {
  const unsignedToken = verifySignedToken(rawToken);
  if (!unsignedToken) return null;

  const tokenHash = hashToken(unsignedToken);

  const found = await pool.query(
    `
    SELECT evt.id AS token_id,
           evt.user_id,
           u.email,
           COALESCE(u.username, u.name, 'User') AS name,
           u.username,
           u.birthdate,
           u.gender,
           u.gender_visible,
           u.onboarding_completed,
           COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, u.birthdate))::int, u.age) AS age,
           u.location,
           u.created_at
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
      username: row.username,
      birthdate: row.birthdate,
      gender: row.gender,
      gender_visible: row.gender_visible,
      onboarding_completed: row.onboarding_completed,
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
