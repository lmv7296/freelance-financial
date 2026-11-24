-- 005_align_users_and_sessions.sql

-- Allow registration with email and password without requiring immediate phone_number or full_name
ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;
ALTER TABLE users ALTER COLUMN full_name DROP NOT NULL;

-- Add token_hash column and index for session lookup
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64);
ALTER TABLE sessions ALTER COLUMN refresh_token_hash DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

