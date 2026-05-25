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
  console.log('API请求:', `${API_BASE_URL}${url}`, options);
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options?.headers || {}),
      },
    });
    console.log('API响应状态:', response.status);
    const data = await response.json();
    console.log('API响应数据:', data);
    return data as ApiResponse<T>;
  } catch (error) {
    console.error('API错误:', error);
    throw error;
  }
};

export const authApi = {
  login: (phone: string, password: string) =>
    apiFetch<{ token: string; user: { id: string; name: string; phone: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),

  signup: (name: string, phone: string, password: string, confirmPassword: string) =>
    apiFetch<{ token: string; user: { id: string; name: string; phone: string } }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, phone, password, confirmPassword }),
    }),

  me: () =>
    apiFetch<{ user: { id: string; name: string; phone: string } }>('/api/auth/me'),

  forgotPassword: (phone: string) =>
    apiFetch<{ message: string; token?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyResetCode: (token: string, code: string) =>
    apiFetch<{ message: string; valid: boolean }>('/api/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({ token, code }),
    }),

  resetPassword: (token: string, code: string, password: string, confirmPassword: string) =>
    apiFetch<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, code, password, confirmPassword }),
    }),

  changePassword: (oldPassword: string, newPassword: string, confirmPassword: string) =>
    apiFetch<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
    }),
};

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
      exceededBudget: boolean;
    } | null>(`/api/budgets/${year}/${month}/summary`),
};

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

export const savingsApi = {
  getAll: () =>
    apiFetch<SavingsRecord[]>('/api/savings'),

  create: (amount: number, note?: string) =>
    apiFetch<SavingsRecord>('/api/savings', {
      method: 'POST',
      body: JSON.stringify({ amount, note }),
    }),
};

export const reminderApi = {
  getSettings: () =>
    apiFetch<{
      id: string;
      userId: string;
      dailyLimitReminder: number;
      dailyLimitAmount: number;
      budgetExceedReminder: number;
      savingsGoalReminder: number;
    }>('/api/reminders/settings'),

  updateSettings: (settings: {
    dailyLimitReminder?: number;
    dailyLimitAmount?: number;
    budgetExceedReminder?: number;
    savingsGoalReminder?: number;
  }) =>
    apiFetch<{
      id: string;
      userId: string;
      dailyLimitReminder: number;
      dailyLimitAmount: number;
      budgetExceedReminder: number;
      savingsGoalReminder: number;
    }>('/api/reminders/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  getNotifications: () =>
    apiFetch<{
      id: string;
      userId: string;
      type: string;
      message: string;
      read: number;
      createdAt: number;
    }[]>('/api/reminders/notifications'),

  markAsRead: (id: string) =>
    apiFetch<{ message: string }>(`/api/reminders/notifications/${id}/read`, {
      method: 'PUT',
    }),

  markAllAsRead: () =>
    apiFetch<{ message: string }>('/api/reminders/notifications/read-all', {
      method: 'PUT',
    }),

  deleteNotification: (id: string) =>
    apiFetch<{ message: string }>(`/api/reminders/notifications/${id}`, {
      method: 'DELETE',
    }),
};

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