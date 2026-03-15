require('dotenv').config();
const bcryptjs = require('bcryptjs');
const pool = require('../src/lib/db');

const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD || 'Passw0rd!234';

const seedUsers = [
  {
    email: 'seed.user01@cnxr.local',
    username: 'seed_user01',
    name: 'Avery Stone',
    birthdate: '1997-05-14',
    gender: 'female',
    location: 'Austin, TX',
    about: 'Coffee shop explorer and weekend climber.',
    currentlyInto: 'Trail running and indie films',
    askMeAbout: 'Best tacos in town',
    photos: [
      'https://picsum.photos/seed/cnxr-user-01-a/640/960',
      'https://picsum.photos/seed/cnxr-user-01-b/640/960',
    ],
    prompts: [
      { question: 'Ideal Sunday?', answer: 'Farmers market then a long walk.' },
      { question: 'Green flag?', answer: 'Kindness with consistency.' },
    ],
    interests: ['hiking', 'coffee', 'cinema'],
  },
  {
    email: 'seed.user02@cnxr.local',
    username: 'seed_user02',
    name: 'Noah Patel',
    birthdate: '1995-11-02',
    gender: 'male',
    location: 'Seattle, WA',
    about: 'Builder by day, home chef by night.',
    currentlyInto: 'Meal prep and sci-fi books',
    askMeAbout: 'My ramen experiments',
    photos: [
      'https://picsum.photos/seed/cnxr-user-02-a/640/960',
      'https://picsum.photos/seed/cnxr-user-02-b/640/960',
    ],
    prompts: [
      { question: 'Favorite comfort food?', answer: 'Spicy miso ramen.' },
      { question: 'Weekend plan?', answer: 'Cook, read, and recharge.' },
    ],
    interests: ['cooking', 'reading', 'travel'],
  },
  {
    email: 'seed.user03@cnxr.local',
    username: 'seed_user03',
    name: 'Lena Brooks',
    birthdate: '1998-03-29',
    gender: 'female',
    location: 'Denver, CO',
    about: 'Design lover and mountain sunrise fan.',
    currentlyInto: 'Pilates and playlist curation',
    askMeAbout: 'My favorite live shows',
    photos: [
      'https://picsum.photos/seed/cnxr-user-03-a/640/960',
      'https://picsum.photos/seed/cnxr-user-03-b/640/960',
    ],
    prompts: [
      { question: 'What recharges you?', answer: 'Music and fresh air.' },
      { question: 'Simple joy?', answer: 'Golden hour walks.' },
    ],
    interests: ['music', 'fitness', 'art'],
  },
  {
    email: 'seed.user04@cnxr.local',
    username: 'seed_user04',
    name: 'Ethan Rivera',
    birthdate: '1994-08-18',
    gender: 'male',
    location: 'San Diego, CA',
    about: 'Ocean person who loves good conversation.',
    currentlyInto: 'Surf mornings and documentaries',
    askMeAbout: 'My top beach spots',
    photos: [
      'https://picsum.photos/seed/cnxr-user-04-a/640/960',
      'https://picsum.photos/seed/cnxr-user-04-b/640/960',
    ],
    prompts: [
      { question: 'Best part of your day?', answer: 'Morning sunrise sessions.' },
      { question: 'What do you value?', answer: 'Honesty and humor.' },
    ],
    interests: ['surfing', 'podcasts', 'photography'],
  },
  {
    email: 'seed.user05@cnxr.local',
    username: 'seed_user05',
    name: 'Maya Chen',
    birthdate: '1996-12-07',
    gender: 'non-binary',
    location: 'Chicago, IL',
    about: 'Curious mind, warm vibes, always learning.',
    currentlyInto: 'Yoga and urban sketching',
    askMeAbout: 'My favorite hidden bookstores',
    photos: [
      'https://picsum.photos/seed/cnxr-user-05-a/640/960',
      'https://picsum.photos/seed/cnxr-user-05-b/640/960',
    ],
    prompts: [
      { question: 'Current obsession?', answer: 'Sketching city corners.' },
      { question: 'Perfect date?', answer: 'Bookstore, coffee, long chat.' },
    ],
    interests: ['yoga', 'books', 'city walks'],
  },
];

async function upsertSeedUser(user, passwordHash) {
  const userResult = await pool.query(
    `
    INSERT INTO users (
      email,
      password_hash,
      name,
      username,
      birthdate,
      gender,
      location,
      about,
      currently_into,
      ask_me_about,
      email_verified,
      email_verified_at,
      onboarding_completed,
      safety_acknowledged,
      show_active_status
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, NOW(), TRUE, TRUE, TRUE
    )
    ON CONFLICT (email)
    DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      name = EXCLUDED.name,
      username = EXCLUDED.username,
      birthdate = EXCLUDED.birthdate,
      gender = EXCLUDED.gender,
      location = EXCLUDED.location,
      about = EXCLUDED.about,
      currently_into = EXCLUDED.currently_into,
      ask_me_about = EXCLUDED.ask_me_about,
      email_verified = TRUE,
      email_verified_at = COALESCE(users.email_verified_at, NOW()),
      onboarding_completed = TRUE,
      safety_acknowledged = TRUE,
      show_active_status = TRUE
    RETURNING id, email, username
    `,
    [
      user.email,
      passwordHash,
      user.name,
      user.username,
      user.birthdate,
      user.gender,
      user.location,
      user.about,
      user.currentlyInto,
      user.askMeAbout,
    ]
  );

  const seededUser = userResult.rows[0];
  const userId = seededUser.id;

  await pool.query('DELETE FROM photos WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM prompts WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM interests WHERE user_id = $1', [userId]);

  for (let i = 0; i < user.photos.length; i += 1) {
    await pool.query(
      `
      INSERT INTO photos (user_id, url, order_index)
      VALUES ($1, $2, $3)
      `,
      [userId, user.photos[i], i]
    );
  }

  for (let i = 0; i < user.prompts.length; i += 1) {
    const prompt = user.prompts[i];
    await pool.query(
      `
      INSERT INTO prompts (user_id, question, answer, order_index)
      VALUES ($1, $2, $3, $4)
      `,
      [userId, prompt.question, prompt.answer, i]
    );
  }

  for (const label of user.interests) {
    await pool.query(
      `
      INSERT INTO interests (user_id, label)
      VALUES ($1, $2)
      `,
      [userId, label]
    );
  }

  await pool.query(
    `
    INSERT INTO user_presence (user_id, online, show_status, updated_at)
    VALUES ($1, TRUE, TRUE, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      online = TRUE,
      show_status = TRUE,
      updated_at = NOW()
    `,
    [userId]
  );

  return seededUser;
}

async function seedMoreUsers() {
  let seeded = [];
  try {
    const passwordHash = await bcryptjs.hash(DEFAULT_PASSWORD, 10);

    await pool.query('BEGIN');
    for (const user of seedUsers) {
      const result = await upsertSeedUser(user, passwordHash);
      seeded.push(result);
    }
    await pool.query('COMMIT');

    console.log(`Seeded ${seeded.length} users successfully.`);
    console.log(`Default password for seeded users: ${DEFAULT_PASSWORD}`);
    for (const user of seeded) {
      console.log(`- ${user.username} (${user.email})`);
    }
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Failed to seed users:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedMoreUsers();
