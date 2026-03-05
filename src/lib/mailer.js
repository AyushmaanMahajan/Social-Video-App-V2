const nodemailer = require('nodemailer');

function isMailerConfigured() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;
  return Boolean(host && user && pass && from);
}

function getMailerConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secureRaw = process.env.SMTP_SECURE;
  const secureExplicit = secureRaw === 'true' || secureRaw === 'false';
  const secure = secureExplicit ? secureRaw === 'true' : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  if (!isMailerConfigured()) {
    const error = new Error('SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM must be configured');
    error.code = 'MAILER_NOT_CONFIGURED';
    throw error;
  }

  return {
    host,
    port,
    secure,
    secureExplicit,
    auth: { user, pass },
    from,
  };
}

function createTransporter(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 15000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 15000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20000),
    tls: {
      servername: config.host,
    },
  });
}

function shouldRetryWithFlippedSecure(error) {
  const command = String(error?.command || '');
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  if (command !== 'CONN') return false;

  const isTimeout = code === 'ETIMEDOUT' || message.includes('greeting never received');
  const isTlsMismatch =
    code === 'ESOCKET' &&
    (message.includes('wrong version number') || message.includes('ssl routines'));
  return isTimeout || isTlsMismatch;
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
}

function getVerificationUrl(token) {
  return `${getBaseUrl().replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
}

async function sendVerificationEmail({ toEmail, toName, token }) {
  const config = getMailerConfig();
  const { from } = config;
  const verifyUrl = getVerificationUrl(token);
  const displayName = toName || 'there';
  const message = {
    from,
    to: toEmail,
    subject: 'Verify your Serendipity Stream email',
    text: `Hi ${displayName}, verify your email by opening this link: ${verifyUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>Hi ${displayName},</p>
        <p>Verify your email to begin onboarding.</p>
        <p><a href="${verifyUrl}">Verify Email</a></p>
        <p>This link expires in 20 minutes.</p>
      </div>
    `,
  };

  const mailer = createTransporter(config);
  try {
    await mailer.sendMail(message);
  } catch (error) {
    if (!shouldRetryWithFlippedSecure(error)) {
      throw error;
    }

    const retryConfig = { ...config, secure: !config.secure };
    const retryMailer = createTransporter(retryConfig);
    await retryMailer.sendMail(message);
  }
}

module.exports = {
  getVerificationUrl,
  isMailerConfigured,
  sendVerificationEmail,
};
