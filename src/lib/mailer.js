function isMailerConfigured() {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;
  return Boolean(apiKey && from);
}

function getMailerConfig() {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;
  const apiBaseUrl = process.env.SENDGRID_API_BASE_URL || 'https://api.sendgrid.com';

  if (!isMailerConfigured()) {
    const error = new Error('SENDGRID_API_KEY and EMAIL_FROM must be configured');
    error.code = 'MAILER_NOT_CONFIGURED';
    throw error;
  }

  return {
    apiKey,
    from,
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
  };
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
}

function getVerificationUrl(token) {
  return `${getBaseUrl().replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
}

async function sendVerificationEmail({ toEmail, toName, token }) {
  const config = getMailerConfig();
  const verifyUrl = getVerificationUrl(token);
  const displayName = toName || 'there';

  const payload = {
    personalizations: [
      {
        to: [{ email: toEmail }],
        subject: 'Verify your Serendipity Stream email',
      },
    ],
    from: { email: config.from },
    content: [
      {
        type: 'text/plain',
        value: `Hi ${displayName}, verify your email by opening this link: ${verifyUrl}`,
      },
      {
        type: 'text/html',
        value: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <p>Hi ${displayName},</p>
            <p>Verify your email to begin onboarding.</p>
            <p><a href="${verifyUrl}">Verify Email</a></p>
            <p>This link expires in 20 minutes.</p>
          </div>
        `,
      },
    ],
  };

  const response = await fetch(`${config.apiBaseUrl}/v3/mail/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) return;

  let responseText = '';
  try {
    responseText = await response.text();
  } catch {
    responseText = '';
  }

  const error = new Error(`SendGrid API error (${response.status}): ${responseText || response.statusText}`);
  error.code = 'SENDGRID_API_ERROR';
  error.responseCode = response.status;
  throw error;
}

module.exports = {
  getVerificationUrl,
  isMailerConfigured,
  sendVerificationEmail,
};
