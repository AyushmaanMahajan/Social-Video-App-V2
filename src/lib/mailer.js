const nodemailer = require('nodemailer');

let transporter = null;

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
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
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
    auth: { user, pass },
    from,
  };
}

function getTransporter() {
  if (transporter) return transporter;
  const config = getMailerConfig();
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
  return transporter;
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
}

function getVerificationUrl(token) {
  return `${getBaseUrl().replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
}

async function sendVerificationEmail({ toEmail, toName, token }) {
  const { from } = getMailerConfig();
  const verifyUrl = getVerificationUrl(token);
  const displayName = toName || 'there';
  const mailer = getTransporter();

  await mailer.sendMail({
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
  });
}

module.exports = {
  getVerificationUrl,
  isMailerConfigured,
  sendVerificationEmail,
};
