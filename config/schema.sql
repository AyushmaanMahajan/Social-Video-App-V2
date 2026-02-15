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
