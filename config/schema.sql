-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  name VARCHAR(100),
  username VARCHAR(20),
  birthdate DATE,
  gender VARCHAR(20),
  gender_visible BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  safety_acknowledged BOOLEAN DEFAULT false,
  report_count INTEGER DEFAULT 0,
  suspension_until TIMESTAMP,
  age INTEGER,
  location VARCHAR(100),
  about TEXT,
  currently_into TEXT,
  ask_me_about TEXT,
  accent_theme VARCHAR(50) DEFAULT 'cyan',
  show_age BOOLEAN DEFAULT true,
  show_location BOOLEAN DEFAULT true,
  show_active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender_visible BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS safety_acknowledged BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_until TIMESTAMP;
ALTER TABLE users ALTER COLUMN name DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower_unique ON users (LOWER(username)) WHERE username IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_username_format_check'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_username_format_check CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_]{3,20}$');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_gender_value_check'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_gender_value_check CHECK (
      gender IS NULL OR gender IN ('female', 'male', 'non-binary', 'prefer_not_to_say')
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_verification_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_token_hash ON email_verification_tokens(token_hash);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Interests table
CREATE TABLE IF NOT EXISTS interests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pools table
CREATE TABLE IF NOT EXISTS pools (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  added_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, added_user_id)
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photo_reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User blocks
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT blocks_not_self CHECK (blocker_id <> blocked_id)
);

-- Video calls (attempts and outcomes for analytics)
CREATE TABLE IF NOT EXISTS video_calls (
  id SERIAL PRIMARY KEY,
  caller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  connected_at TIMESTAMP,
  ended_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  failure_reason VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT video_calls_status_check CHECK (status IN ('pending', 'failed', 'connected', 'rejected', 'timeout'))
);

CREATE INDEX IF NOT EXISTS idx_video_calls_caller ON video_calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_receiver ON video_calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_started_at ON video_calls(started_at);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pools_user_id ON pools(user_id);
CREATE INDEX IF NOT EXISTS idx_pools_added_user_id ON pools(added_user_id);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_interests_user_id ON interests(user_id);

-- Encounter skips table to throttle repeat encounters
CREATE TABLE IF NOT EXISTS encounter_skips (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  skipped_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  skipped_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounter_skips_user ON encounter_skips(user_id);
CREATE INDEX IF NOT EXISTS idx_encounter_skips_skipped ON encounter_skips(skipped_user_id);
CREATE INDEX IF NOT EXISTS idx_encounter_skips_recent ON encounter_skips(user_id, skipped_user_id, skipped_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_encounter_skips_unique ON encounter_skips(user_id, skipped_user_id);

-- Interactions (post-encounter outcomes)
CREATE TABLE IF NOT EXISTS interactions (
  id SERIAL PRIMARY KEY,
  user_a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('connected','skipped','timeout')),
  created_at TIMESTAMP DEFAULT NOW(),
  last_interaction_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interactions_pair ON interactions(user_a, user_b);
CREATE INDEX IF NOT EXISTS idx_interactions_last ON interactions(last_interaction_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_interactions_unique_pair ON interactions(user_a, user_b);

ALTER TABLE reports ADD COLUMN IF NOT EXISTS encounter_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_encounter_id_fk'
  ) THEN
    ALTER TABLE reports
    ADD CONSTRAINT reports_encounter_id_fk
    FOREIGN KEY (encounter_id)
    REFERENCES interactions(id)
    ON DELETE SET NULL;
  END IF;
END
$$;

-- Mutual chat opt-in per pair
CREATE TABLE IF NOT EXISTS interaction_chat_settings (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, target_user_id)
);

-- Encounter/chat messages
CREATE TABLE IF NOT EXISTS encounter_messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encounter_id INTEGER REFERENCES interactions(id) ON DELETE SET NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_encounter_messages_pair ON encounter_messages(sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_encounter_messages_encounter ON encounter_messages(encounter_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_reported_recent ON reports(reported_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_recent ON reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_reports_reported_recent ON photo_reports(reported_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);

-- Presence (online + visibility)
CREATE TABLE IF NOT EXISTS user_presence (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  online BOOLEAN DEFAULT FALSE,
  show_status BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_presence_online ON user_presence(online);



ALTER TABLE users
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Prevent accidental base64/raw-image storage in photos.url.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'photos_url_http_check'
  ) THEN
    ALTER TABLE photos
    ADD CONSTRAINT photos_url_http_check CHECK (url ~* '^https?://');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'photos_url_not_data_uri_check'
  ) THEN
    ALTER TABLE photos
    ADD CONSTRAINT photos_url_not_data_uri_check CHECK (url !~* '^data:');
  END IF;
END
$$;

