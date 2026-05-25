-- Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS PasswordResetTokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Create index for token lookup
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON PasswordResetTokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id ON PasswordResetTokens(user_id);
