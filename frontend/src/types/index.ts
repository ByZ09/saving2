export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface MonthlyBudget {
  id: string;
  userId: string;
  year: number;
  month: number;
  totalIncome: string;
  savingsGoal: string;
  availableBudget: string;
  dailyAllowance: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  userId: string;
  budgetId: string | null;
  amount: string;
  category: ExpenseCategory;
  note: string | null;
  expenseDate: string;
  createdAt: string;
}

export type ExpenseCategory = 'food' | 'shopping' | 'transport' | 'entertainment' | 'study' | 'other';

export interface SavingsRecord {
  id: string;
  userId: string;
  budgetId: string | null;
  amount: string;
  type: 'auto' | 'manual';
  note: string | null;
  recordDate: string;
  createdAt: string;
}

export interface EmergencyFund {
  id: string;
  userId: string;
  balance: string;
  targetAmount: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyFundTransaction {
  id: string;
  userId: string;
  amount: string;
  type: 'deposit' | 'withdraw';
  reason: string | null;
  createdAt: string;
}

export interface CategoryBreakdown {
  category: string;
  total: string;
  count: number;
}

export interface DailyTrend {
  date: string;
  totalExpense: string;
}

export interface DashboardData {
  budget: MonthlyBudget;
  totalExpenses: number;
  totalSavings: number;
  todayExpenses: number;
  todayRemaining: number;
  dailyAllowance: number;
  categoryBreakdown: CategoryBreakdown[];
  dailyTrend: DailyTrend[];
  daysInMonth: number;
  dayOfMonth: number;
  smartAllocation: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  locked?: boolean;
  remainingAttempts?: number;
}

export type AppView = 'dashboard' | 'history' | 'stats' | 'emergency' | 'settings';

export const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
  food: { label: '餐饮', emoji: '🍜', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  shopping: { label: '购物', emoji: '🛍️', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  transport: { label: '交通', emoji: '🚌', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  entertainment: { label: '娱乐', emoji: '🎮', color: 'text-green-600', bgColor: 'bg-green-50' },
  study: { label: '学习', emoji: '📚', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  other: { label: '其他', emoji: '📦', color: 'text-gray-600', bgColor: 'bg-gray-50' },
};
