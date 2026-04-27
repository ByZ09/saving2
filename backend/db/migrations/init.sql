-- Users Table
CREATE TABLE IF NOT EXISTS Users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  emergency_fund_password TEXT,
  emergency_fund_lock_until INTEGER,
  emergency_fund_failed_attempts INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

-- Monthly Budgets Table
CREATE TABLE IF NOT EXISTS MonthlyBudgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_income REAL NOT NULL,
  savings_goal REAL NOT NULL,
  available_budget REAL NOT NULL,
  daily_allowance REAL NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS Expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  budget_id TEXT,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  note TEXT,
  expense_date INTEGER DEFAULT (unixepoch()) NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (budget_id) REFERENCES MonthlyBudgets(id) ON DELETE SET NULL
);

-- Savings Records Table
CREATE TABLE IF NOT EXISTS SavingsRecords (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  budget_id TEXT,
  amount REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'auto',
  note TEXT,
  record_date INTEGER DEFAULT (unixepoch()) NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (budget_id) REFERENCES MonthlyBudgets(id) ON DELETE SET NULL
);

-- Emergency Fund Table
CREATE TABLE IF NOT EXISTS EmergencyFund (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  balance REAL NOT NULL DEFAULT 0,
  target_amount REAL NOT NULL DEFAULT 1000,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Emergency Fund Transactions Table
CREATE TABLE IF NOT EXISTS EmergencyFundTransactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Uploads Table
CREATE TABLE IF NOT EXISTS Uploads (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  s3_url TEXT NOT NULL,
  upload_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user_id ON MonthlyBudgets(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON Expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_budget_id ON Expenses(budget_id);
CREATE INDEX IF NOT EXISTS idx_savings_records_user_id ON SavingsRecords(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_records_budget_id ON SavingsRecords(budget_id);
CREATE INDEX IF NOT EXISTS idx_emergency_fund_user_id ON EmergencyFund(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_fund_transactions_user_id ON EmergencyFundTransactions(user_id);
