-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
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

-- Presence (online + visibility)
CREATE TABLE IF NOT EXISTS user_presence (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  online BOOLEAN DEFAULT FALSE,
  show_status BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_presence_online ON user_presence(online);
