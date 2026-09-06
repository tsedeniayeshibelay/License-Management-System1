-- Add 6-digit verification code column to password_reset_tokens
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS code VARCHAR(10);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_code ON password_reset_tokens(code);
