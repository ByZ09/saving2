-- Reminder Settings Table
CREATE TABLE IF NOT EXISTS ReminderSettings (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  daily_limit_reminder INTEGER DEFAULT 1 NOT NULL,
  daily_limit_amount REAL DEFAULT 0 NOT NULL,
  budget_exceed_reminder INTEGER DEFAULT 1 NOT NULL,
  savings_goal_reminder INTEGER DEFAULT 1 NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Reminder Notifications Table
CREATE TABLE IF NOT EXISTS ReminderNotifications (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);