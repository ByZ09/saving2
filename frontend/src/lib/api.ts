import { API_BASE_URL } from '../config/constants';
import type {
  ApiResponse,
  MonthlyBudget,
  Expense,
  SavingsRecord,
  EmergencyFund,
  EmergencyFundTransaction,
  DashboardData,
  CategoryBreakdown,
  DailyTrend,
} from '../types';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const apiFetch = async <T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> => {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    },
  });
  return response.json() as Promise<ApiResponse<T>>;
};

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: { id: string; name: string; email: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (name: string, email: string, password: string, confirmPassword: string) =>
    apiFetch<{ token: string; user: { id: string; name: string; email: string } }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, confirmPassword }),
    }),

  me: () =>
    apiFetch<{ user: { id: string; name: string; email: string } }>('/api/auth/me'),
};

// Budgets
export const budgetApi = {
  getCurrent: () =>
    apiFetch<DashboardData | null>('/api/budgets/current'),

  getAll: () =>
    apiFetch<MonthlyBudget[]>('/api/budgets'),

  createOrUpdate: (totalIncome: number, savingsGoal: number, year?: number, month?: number) =>
    apiFetch<MonthlyBudget>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify({ totalIncome, savingsGoal, year, month }),
    }),

  getMonthlySummary: (year: number, month: number) =>
    apiFetch<{
      budget: MonthlyBudget;
      totalExpenses: number;
      totalSavings: number;
      categoryBreakdown: CategoryBreakdown[];
      dailyTrend: DailyTrend[];
    } | null>(`/api/budgets/${year}/${month}/summary`),
};

// Expenses
export const expenseApi = {
  getAll: (limit?: number) =>
    apiFetch<Expense[]>(`/api/expenses${limit ? `?limit=${limit}` : ''}`),

  create: (amount: number, category: string, note?: string, autoSaveRemaining?: boolean) =>
    apiFetch<{ expense: Expense; savingsRecord: SavingsRecord | null }>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify({ amount, category, note, autoSaveRemaining }),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/expenses/${id}`, { method: 'DELETE' }),
};

// Savings
export const savingsApi = {
  getAll: () =>
    apiFetch<SavingsRecord[]>('/api/savings'),

  create: (amount: number, note?: string) =>
    apiFetch<SavingsRecord>('/api/savings', {
      method: 'POST',
      body: JSON.stringify({ amount, note }),
    }),
};

// Emergency Fund
export const emergencyFundApi = {
  getInfo: () =>
    apiFetch<{ id: string; targetAmount: string; hasPassword: boolean; createdAt: string }>('/api/emergency-fund'),

  verify: (password: string) =>
    apiFetch<{ fund: EmergencyFund; transactions: EmergencyFundTransaction[] }>('/api/emergency-fund/verify', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  setPassword: (password: string) =>
    apiFetch<{ message: string }>('/api/emergency-fund/set-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  deposit: (amount: number, reason?: string) =>
    apiFetch<EmergencyFund>('/api/emergency-fund/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    }),

  withdraw: (amount: number, password: string, reason?: string) =>
    apiFetch<{ fund: EmergencyFund; withdrawAmount: number }>('/api/emergency-fund/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, password, reason }),
    }),

  updateTarget: (targetAmount: number) =>
    apiFetch<EmergencyFund>('/api/emergency-fund/target', {
      method: 'PUT',
      body: JSON.stringify({ targetAmount }),
    }),
};
