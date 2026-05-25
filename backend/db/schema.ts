import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// ============================================
// Users Table
// ============================================
export const users = sqliteTable('Users', {
  id: text('id')
    .primaryKey()
    .notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  password: text('password').notNull(),
  emergencyFundPassword: text('emergency_fund_password'),
  emergencyFundLockUntil: integer('emergency_fund_lock_until'),
  emergencyFundFailedAttempts: integer('emergency_fund_failed_attempts').default(0).notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
});

export const insertUserSchema = createInsertSchema(users, {
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, 'Please enter a valid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = insertUserSchema.partial();

export const loginUserSchema = insertUserSchema.pick({
  phone: true,
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
// Change Password Schema
// ============================================
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(6, 'Old password must be at least 6 characters'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================
// Monthly Budgets Table
// ============================================
export const monthlyBudgets = sqliteTable('MonthlyBudgets', {
  id: text('id')
    .primaryKey()
    .notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  totalIncome: real('total_income').notNull(),
  savingsGoal: real('savings_goal').notNull(),
  availableBudget: real('available_budget').notNull(),
  dailyAllowance: real('daily_allowance').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
});

export const insertMonthlyBudgetSchema = createInsertSchema(monthlyBudgets, {
  userId: z.string(),
  totalIncome: z.coerce.string(),
  savingsGoal: z.coerce.string(),
  availableBudget: z.coerce.string(),
  dailyAllowance: z.coerce.string(),
  year: z.coerce.number().int().positive(),
  month: z.coerce.number().int().min(1).max(12),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMonthlyBudgetSchema = insertMonthlyBudgetSchema.partial();

export type MonthlyBudget = typeof monthlyBudgets.$inferSelect;
export type InsertMonthlyBudget = typeof monthlyBudgets.$inferInsert;

// ============================================
// Expenses Table
// ============================================
export const expenses = sqliteTable('Expenses', {
  id: text('id')
    .primaryKey()
    .notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  budgetId: text('budget_id').references(() => monthlyBudgets.id, { onDelete: 'set null' }),
  amount: real('amount').notNull(),
  category: text('category').notNull(),
  note: text('note'),
  expenseDate: integer('expense_date').notNull().default(sql`(unixepoch())`),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
});

export const insertExpenseSchema = createInsertSchema(expenses, {
  userId: z.string(),
  budgetId: z.string().nullable().optional(),
  amount: z.coerce.string(),
  category: z.enum(['food', 'shopping', 'transport', 'entertainment', 'study', 'other']),
  note: z.string().nullable().optional(),
  expenseDate: z.date().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const updateExpenseSchema = insertExpenseSchema.partial();

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ============================================
// Savings Records Table
// ============================================
export const savingsRecords = sqliteTable('SavingsRecords', {
  id: text('id')
    .primaryKey()
    .notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  budgetId: text('budget_id').references(() => monthlyBudgets.id, { onDelete: 'set null' }),
  amount: real('amount').notNull(),
  type: text('type').notNull().default('auto'),
  note: text('note'),
  recordDate: integer('record_date').notNull().default(sql`(unixepoch())`),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
});

export const insertSavingsRecordSchema = createInsertSchema(savingsRecords, {
  userId: z.string(),
  budgetId: z.string().nullable().optional(),
  amount: z.coerce.string(),
  type: z.enum(['auto', 'manual']).optional(),
  note: z.string().nullable().optional(),
  recordDate: z.date().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type SavingsRecord = typeof savingsRecords.$inferSelect;
export type InsertSavingsRecord = typeof savingsRecords.$inferInsert;

// ============================================
// Emergency Fund Table
// ============================================
export const emergencyFund = sqliteTable('EmergencyFund', {
  id: text('id')
    .primaryKey()
    .notNull(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  balance: real('balance').notNull().default(0),
  targetAmount: real('target_amount').notNull().default(1000),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
});

export const insertEmergencyFundSchema = createInsertSchema(emergencyFund, {
  balance: z.coerce.string().optional(),
  targetAmount: z.coerce.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EmergencyFund = typeof emergencyFund.$inferSelect;
export type InsertEmergencyFund = typeof emergencyFund.$inferInsert;

// ============================================
// Emergency Fund Transactions Table
// ============================================
export const emergencyFundTransactions = sqliteTable('EmergencyFundTransactions', {
  id: text('id')
    .primaryKey()
    .notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  type: text('type').notNull(),
  reason: text('reason'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
});

export const insertEmergencyFundTransactionSchema = createInsertSchema(emergencyFundTransactions, {
  amount: z.coerce.string(),
  type: z.enum(['deposit', 'withdraw']),
  reason: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type EmergencyFundTransaction = typeof emergencyFundTransactions.$inferSelect;
export type InsertEmergencyFundTransaction = typeof emergencyFundTransactions.$inferInsert;

// ============================================
// Uploads Table
// ============================================
export const uploads = sqliteTable('Uploads', {
  id: text('id')
    .primaryKey()
    .notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  fileType: text('file_type').notNull(),
  s3Key: text('s3_key').notNull(),
  s3Url: text('s3_url').notNull(),
  uploadId: text('upload_id'),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
});

export const insertUploadSchema = createInsertSchema(uploads, {
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().int().positive('File size must be positive'),
  fileType: z.string().min(1, 'File type is required'),
  s3Key: z.string().min(1, 'S3 key is required'),
  s3Url: z.string().url('Invalid S3 URL'),
  uploadId: z.string().optional(),
  status: z.enum(['pending', 'uploading', 'completed', 'failed']).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUploadSchema = insertUploadSchema.partial();

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = typeof uploads.$inferInsert;

// ============================================
// Password Reset Tokens Table
// ============================================
export const passwordResetTokens = sqliteTable('PasswordResetTokens', {
  id: text('id')
    .primaryKey()
    .notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  code: text('code').notNull(),
  expiresAt: integer('expires_at').notNull(),
  used: integer('used').default(0).notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
});

export const insertPasswordResetTokenSchema = z.object({
  userId: z.string(),
  token: z.string(),
  code: z.string().length(6, '验证码必须是6位数字'),
  expiresAt: z.number(),
  used: z.number().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
});

export const verifyResetCodeSchema = z.object({
  token: z.string(),
  code: z.string().length(6, '验证码必须是6位数字'),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  code: z.string().length(6, '验证码必须是6位数字'),
  password: z.string().min(6, '密码至少需要6个字符'),
  confirmPassword: z.string().min(6, '确认密码至少需要6个字符'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ============================================
// Reminder Settings Table
// ============================================
export const reminderSettings = sqliteTable('ReminderSettings', {
  id: text('id')
    .primaryKey()
    .notNull(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  dailyLimitReminder: integer('daily_limit_reminder').default(1).notNull(),
  dailyLimitAmount: real('daily_limit_amount').default(0).notNull(),
  budgetExceedReminder: integer('budget_exceed_reminder').default(1).notNull(),
  savingsGoalReminder: integer('savings_goal_reminder').default(1).notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
});

export const insertReminderSettingsSchema = createInsertSchema(reminderSettings, {
  userId: z.string(),
  dailyLimitReminder: z.number().int().min(0).max(1).optional(),
  dailyLimitAmount: z.coerce.number().min(0).optional(),
  budgetExceedReminder: z.number().int().min(0).max(1).optional(),
  savingsGoalReminder: z.number().int().min(0).max(1).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateReminderSettingsSchema = insertReminderSettingsSchema.partial();

export type ReminderSettings = typeof reminderSettings.$inferSelect;
export type InsertReminderSettings = typeof reminderSettings.$inferInsert;

// ============================================
// Reminder Notifications Table
// ============================================
export const reminderNotifications = sqliteTable('ReminderNotifications', {
  id: text('id')
    .primaryKey()
    .notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  message: text('message').notNull(),
  read: integer('read').default(0).notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
});

export const insertReminderNotificationSchema = createInsertSchema(reminderNotifications, {
  userId: z.string(),
  type: z.enum(['daily_limit', 'budget_exceed', 'savings_goal']),
  message: z.string(),
  read: z.number().int().min(0).max(1).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type ReminderNotification = typeof reminderNotifications.$inferSelect;
export type InsertReminderNotification = typeof reminderNotifications.$inferInsert;