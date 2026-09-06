-- Add login_count column to users table
-- Default is 2 so existing users who have already logged in are treated as returning users
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INT NOT NULL DEFAULT 2;
