import { pgTable, text, timestamp, integer, numeric } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// ============================================
// Users Table
// ============================================
export const users = pgTable('Users', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  emergencyFundPassword: text('emergency_fund_password'),
  emergencyFundLockUntil: timestamp('emergency_fund_lock_until'),
  emergencyFundFailedAttempts: integer('emergency_fund_failed_attempts').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users, {
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const updateUserSchema = insertUserSchema.partial();

export const loginUserSchema = insertUserSchema.pick({
  email: true,
  password: true,
});

export const signupUserSchema = insertUserSchema
  .extend({
    confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type SignupUserInput = z.infer<typeof signupUserSchema>;

// ============================================
// Monthly Budgets Table
// ============================================
export const monthlyBudgets = pgTable('MonthlyBudgets', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  totalIncome: numeric('total_income', { precision: 10, scale: 2 }).notNull(),
  savingsGoal: numeric('savings_goal', { precision: 10, scale: 2 }).notNull(),
  availableBudget: numeric('available_budget', { precision: 10, scale: 2 }).notNull(),
  dailyAllowance: numeric('daily_allowance', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertMonthlyBudgetSchema = createInsertSchema(monthlyBudgets, {
  userId: z.string(),
  totalIncome: z.coerce.string(),
  savingsGoal: z.coerce.string(),
  availableBudget: z.coerce.string(),
  dailyAllowance: z.coerce.string(),
  year: z.coerce.number().int().positive(),
  month: z.coerce.number().int().min(1).max(12),
});

export const updateMonthlyBudgetSchema = insertMonthlyBudgetSchema.partial();

export type MonthlyBudget = typeof monthlyBudgets.$inferSelect;
export type InsertMonthlyBudget = typeof monthlyBudgets.$inferInsert;

// ============================================
// Expenses Table
// ============================================
export const expenses = pgTable('Expenses', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  budgetId: text('budget_id').references(() => monthlyBudgets.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  category: text('category').notNull(),
  note: text('note'),
  expenseDate: timestamp('expense_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insertExpenseSchema = createInsertSchema(expenses, {
  userId: z.string(),
  budgetId: z.string().nullable().optional(),
  amount: z.coerce.string(),
  category: z.enum(['food', 'shopping', 'transport', 'entertainment', 'study', 'other']),
  note: z.string().nullable().optional(),
  expenseDate: z.date().optional(),
});

export const updateExpenseSchema = insertExpenseSchema.partial();

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ============================================
// Savings Records Table
// ============================================
export const savingsRecords = pgTable('SavingsRecords', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  budgetId: text('budget_id').references(() => monthlyBudgets.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  type: text('type').notNull().default('auto'),
  note: text('note'),
  recordDate: timestamp('record_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insertSavingsRecordSchema = createInsertSchema(savingsRecords, {
  userId: z.string(),
  budgetId: z.string().nullable().optional(),
  amount: z.coerce.string(),
  type: z.enum(['auto', 'manual']).optional(),
  note: z.string().nullable().optional(),
  recordDate: z.date().optional(),
});

export type SavingsRecord = typeof savingsRecords.$inferSelect;
export type InsertSavingsRecord = typeof savingsRecords.$inferInsert;

// ============================================
// Emergency Fund Table
// ============================================
export const emergencyFund = pgTable('EmergencyFund', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  balance: numeric('balance', { precision: 10, scale: 2 }).notNull().default('0'),
  targetAmount: numeric('target_amount', { precision: 10, scale: 2 }).notNull().default('1000'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertEmergencyFundSchema = createInsertSchema(emergencyFund, {
  balance: z.coerce.string().optional(),
  targetAmount: z.coerce.string().optional(),
});

export type EmergencyFund = typeof emergencyFund.$inferSelect;
export type InsertEmergencyFund = typeof emergencyFund.$inferInsert;

// ============================================
// Emergency Fund Transactions Table
// ============================================
export const emergencyFundTransactions = pgTable('EmergencyFundTransactions', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  type: text('type').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insertEmergencyFundTransactionSchema = createInsertSchema(emergencyFundTransactions, {
  amount: z.coerce.string(),
  type: z.enum(['deposit', 'withdraw']),
  reason: z.string().optional(),
});

export type EmergencyFundTransaction = typeof emergencyFundTransactions.$inferSelect;
export type InsertEmergencyFundTransaction = typeof emergencyFundTransactions.$inferInsert;

// ============================================
// Uploads Table
// ============================================
export const uploads = pgTable('Uploads', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  fileType: text('file_type').notNull(),
  s3Key: text('s3_key').notNull(),
  s3Url: text('s3_url').notNull(),
  uploadId: text('upload_id'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertUploadSchema = createInsertSchema(uploads, {
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().int().positive('File size must be positive'),
  fileType: z.string().min(1, 'File type is required'),
  s3Key: z.string().min(1, 'S3 key is required'),
  s3Url: z.string().url('Invalid S3 URL'),
  uploadId: z.string().optional(),
  status: z.enum(['pending', 'uploading', 'completed', 'failed']).optional(),
});

export const updateUploadSchema = insertUploadSchema.partial();

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = typeof uploads.$inferInsert;
