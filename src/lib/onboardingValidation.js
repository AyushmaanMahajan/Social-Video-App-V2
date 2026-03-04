const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'support',
  'help',
  'staff',
  'mod',
  'moderator',
  'system',
  'root',
  'owner',
  'serendipity',
  'serendipitystream',
]);

const BANNED_USERNAME_TERMS = [
  'porn',
  'nude',
  'nudes',
  'xxx',
  'sex',
  'slut',
  'whore',
  'rapist',
  'kill',
  'abuse',
  'terror',
];

const GENDER_OPTIONS = ['female', 'male', 'non-binary', 'prefer_not_to_say'];

const REPORT_REASONS = ['harassment', 'nudity_or_sexual_content', 'hate_speech', 'spam', 'other'];

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'guerrillamail.com',
  'tempmail.com',
  'dispostable.com',
  'trashmail.com',
  'sharklasers.com',
  'yopmail.com',
]);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || '').trim();
}

function normalizeGender(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function hasBannedUsernameTerm(username) {
  const normalized = normalizeUsername(username).toLowerCase();
  if (!normalized) return false;
  return BANNED_USERNAME_TERMS.some((term) => normalized.includes(term));
}

function validateUsername(username) {
  const normalized = normalizeUsername(username);
  if (!normalized) return { valid: false, error: 'Username is required.' };
  if (!USERNAME_REGEX.test(normalized)) {
    return {
      valid: false,
      error: 'Username must be 3-20 characters and only contain letters, numbers, or underscores.',
    };
  }

  const lower = normalized.toLowerCase();
  if (RESERVED_USERNAMES.has(lower)) {
    return { valid: false, error: 'This username is reserved. Please choose another.' };
  }

  if (hasBannedUsernameTerm(lower)) {
    return { valid: false, error: 'This username is not allowed.' };
  }

  return { valid: true, username: normalized };
}

function calculateAgeFromBirthdate(birthdateValue, now = new Date()) {
  const birthdate = new Date(`${birthdateValue}T00:00:00.000Z`);
  if (Number.isNaN(birthdate.getTime())) return null;

  let age = now.getUTCFullYear() - birthdate.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birthdate.getUTCMonth();
  const dayDiff = now.getUTCDate() - birthdate.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age;
}

function validateBirthdate(value) {
  const birthdate = String(value || '').trim();
  if (!birthdate) return { valid: false, error: 'Birthdate is required.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
    return { valid: false, error: 'Birthdate must be in YYYY-MM-DD format.' };
  }

  const parsed = new Date(`${birthdate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, error: 'Birthdate is invalid.' };
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (parsed > todayUtc) {
    return { valid: false, error: 'Birthdate cannot be in the future.' };
  }

  const age = calculateAgeFromBirthdate(birthdate, todayUtc);
  if (age === null) return { valid: false, error: 'Birthdate is invalid.' };
  if (age < 18) return { valid: false, error: 'You must be at least 18 years old to use this platform.' };
  if (age > 100) return { valid: false, error: 'Birthdate is outside the allowed range.' };

  return { valid: true, birthdate, age };
}

function validateGender(value) {
  const normalized = normalizeGender(value);
  if (!normalized) return { valid: false, error: 'Gender selection is required.' };
  if (!GENDER_OPTIONS.includes(normalized)) {
    return { valid: false, error: 'Invalid gender selection.' };
  }
  return { valid: true, gender: normalized };
}

function validateReportReason(value) {
  const normalized = normalizeGender(value).replace(/_+/g, '_');
  if (!REPORT_REASONS.includes(normalized)) {
    return { valid: false, error: 'Invalid report reason.' };
  }
  return { valid: true, reason: normalized };
}

function isDisposableEmailDomain(email) {
  const normalized = normalizeEmail(email);
  const parts = normalized.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  if (!domain) return false;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  return Array.from(DISPOSABLE_EMAIL_DOMAINS).some((blocked) => domain.endsWith(`.${blocked}`));
}

module.exports = {
  GENDER_OPTIONS,
  REPORT_REASONS,
  calculateAgeFromBirthdate,
  isDisposableEmailDomain,
  normalizeEmail,
  normalizeGender,
  normalizeUsername,
  validateBirthdate,
  validateGender,
  validateReportReason,
  validateUsername,
};
