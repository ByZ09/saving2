-- Migration: Add finance tables for campus savings system

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add emergency fund fields to Users table
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "emergency_fund_password" TEXT;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "emergency_fund_lock_until" TIMESTAMP;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "emergency_fund_failed_attempts" INTEGER NOT NULL DEFAULT 0;

-- Monthly Budgets
CREATE TABLE IF NOT EXISTS "MonthlyBudgets" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "total_income" NUMERIC(10,2) NOT NULL,
  "savings_goal" NUMERIC(10,2) NOT NULL,
  "available_budget" NUMERIC(10,2) NOT NULL,
  "daily_allowance" NUMERIC(10,2) NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "monthly_budgets_user_year_month" ON "MonthlyBudgets"("user_id", "year", "month");

-- Expenses
CREATE TABLE IF NOT EXISTS "Expenses" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "budget_id" TEXT REFERENCES "MonthlyBudgets"("id") ON DELETE SET NULL,
  "amount" NUMERIC(10,2) NOT NULL,
  "category" TEXT NOT NULL,
  "note" TEXT,
  "expense_date" TIMESTAMP DEFAULT NOW() NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "expenses_user_id_idx" ON "Expenses"("user_id");
CREATE INDEX IF NOT EXISTS "expenses_expense_date_idx" ON "Expenses"("expense_date");

-- Savings Records
CREATE TABLE IF NOT EXISTS "SavingsRecords" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "budget_id" TEXT REFERENCES "MonthlyBudgets"("id") ON DELETE SET NULL,
  "amount" NUMERIC(10,2) NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'auto',
  "note" TEXT,
  "record_date" TIMESTAMP DEFAULT NOW() NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "savings_records_user_id_idx" ON "SavingsRecords"("user_id");

-- Emergency Fund
CREATE TABLE IF NOT EXISTS "EmergencyFund" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL UNIQUE REFERENCES "Users"("id") ON DELETE CASCADE,
  "balance" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "target_amount" NUMERIC(10,2) NOT NULL DEFAULT 1000,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Emergency Fund Transactions
CREATE TABLE IF NOT EXISTS "EmergencyFundTransactions" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "amount" NUMERIC(10,2) NOT NULL,
  "type" TEXT NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ef_transactions_user_id_idx" ON "EmergencyFundTransactions"("user_id");
