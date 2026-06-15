import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { budgetApi, expenseApi, savingsApi, emergencyFundApi } from '../lib/api';
import { ReminderSettings } from '../components/custom/ReminderSettings';
import DataExport from '../components/custom/DataExport';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import OmniflowBadge from '../components/custom/OmniflowBadge';
import type { DashboardData, Expense, SavingsRecord, AppView, ExpenseCategory } from '../types';
import { CATEGORY_CONFIG } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtShort = (n: number | string) => {
  const v = parseFloat(String(n));
  return `¥${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}`;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

const monthLabel = (year: number, month: number) => `${year}年${month}月`;

// ─── Progress Bar ────────────────────────────────────────────────────────────
const ProgressBar = ({ value, max, color = 'bg-primary' }: { value: number; max: number; color?: string }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="bg-muted rounded-full h-2">
      <div
        className={`${color} rounded-full h-2 transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({
  label, value, sub, progress, progressMax, progressColor, icon, gradient,
}: {
  label: string; value: string; sub: string;
  progress?: number; progressMax?: number; progressColor?: string;
  icon: React.ReactNode; gradient?: boolean;
}) => (
  <div className={`rounded-2xl p-5 ${
    gradient
      ? 'bg-gradient-to-br from-primary to-[oklch(0.52_0.14_185)] text-white shadow-lg'
      : 'bg-card border border-border shadow-sm hover:shadow-md transition-shadow duration-200'
  }`}>
    <div className="flex items-center justify-between mb-3">
      <span className={`text-xs font-medium uppercase tracking-wide ${
        gradient ? 'text-white/70' : 'text-muted-foreground'
      }`}>{label}</span>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        gradient ? 'bg-white/20' : 'bg-muted'
      }`}>{icon}</div>
    </div>
    <p className={`font-heading font-bold text-3xl ${
      gradient ? 'text-white' : 'text-foreground'
    }`}>{value}</p>
    <p className={`text-sm mt-1 ${
      gradient ? 'text-white/70' : 'text-muted-foreground'
    }`}>{sub}</p>
    {progress !== undefined && progressMax !== undefined && (
      <>
        <div className={`mt-3 rounded-full h-1.5 ${
          gradient ? 'bg-white/20' : 'bg-muted'
        }`}>
          <div
            className={`rounded-full h-1.5 transition-all duration-700 ${
              gradient ? 'bg-white' : (progressColor || 'bg-primary')
            }`}
            style={{ width: `${progressMax > 0 ? Math.min(100, (progress / progressMax) * 100) : 0}%` }}
          />
        </div>
        <p className={`text-xs mt-1 ${
          gradient ? 'text-white/60' : 'text-muted-foreground'
        }`}>
          {progressMax > 0 ? Math.round((progress / progressMax) * 100) : 0}%
        </p>
      </>
    )}
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const Index = () => {
  const { logout } = useAuth();
  const routerNavigate = useNavigate();
  const [view, setView] = useState<AppView>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dashboard data
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  // Expense form
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory | ''>('');
  const [expNote, setExpNote] = useState('');
  const [expLoading, setExpLoading] = useState(false);

  // Budget setup
  const [income, setIncome] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [showBudgetSetup, setShowBudgetSetup] = useState(false);
  const [useAIPlan, setUseAIPlan] = useState(false);
  
  // Daily budget details
  const [dailyDetails, setDailyDetails] = useState<{
    day: number;
    date: string;
    dayOfWeek: number;
    dayName: string;
    dailyAllowance: number;
    dayExpenses: number;
    remaining: number;
    isToday: boolean;
  }[]>([]);
  const [dailyDetailsLoading, setDailyDetailsLoading] = useState(false);
  const [aiPlanResult, setAiPlanResult] = useState<{
    suggestedSavings: number;
    monthlyBudget: number;
    dailyBudget: number;
    summary: string;
    advice: string;
    suggestions: { dayName: string; suggestedAmount: number; reason: string }[];
  } | null>(null);

  // History
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savings, setSavings] = useState<SavingsRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState<'expenses' | 'savings'>('expenses');

  // Emergency fund
  const [efInfo, setEfInfo] = useState<{ id: string; targetAmount: string; hasPassword: boolean } | null>(null);
  const [efUnlocked, setEfUnlocked] = useState(false);
  const [efBalance, setEfBalance] = useState<string | null>(null);
  const [efTransactions, setEfTransactions] = useState<{ id: string; type: string; amount: string; reason?: string; createdAt: string }[]>([]);
  const [efPassword, setEfPassword] = useState('');
  const [efNewPassword, setEfNewPassword] = useState('');
  const [efConfirmPassword, setEfConfirmPassword] = useState('');
  const [efDepositAmount, setEfDepositAmount] = useState('');
  const [efWithdrawAmount, setEfWithdrawAmount] = useState('');
  const [efWithdrawPassword, setEfWithdrawPassword] = useState('');
  const [efWithdrawReason, setEfWithdrawReason] = useState('');
  const [efTargetAmount, setEfTargetAmount] = useState('');
  const [efLoading, setEfLoading] = useState(false);
  const [efRemainingAttempts, setEfRemainingAttempts] = useState(5);
  const [efLocked, setEfLocked] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);

  // User info from token
  const [userName, setUserName] = useState('');

  // Stats view
  const [statsYear, setStatsYear] = useState(new Date().getFullYear());
  const [statsMonth, setStatsMonth] = useState(new Date().getMonth() + 1);
  const [statsData, setStatsData] = useState<{
    budget: { totalIncome: string; savingsGoal: string; availableBudget: string; dailyAllowance: string; year: number; month: number };
    totalExpenses: number;
    totalSavings: number;
    categoryBreakdown: { category: string; total: string; count: number }[];
    dailyTrend: { date: string; totalExpense: string }[];
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ── Load user name from token ──
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.email) {
          // Fetch user name from /api/auth/me
          fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((d) => { if (d.success) setUserName(d.data.user.name); });
        }
      } catch { /* ignore */ }
    }
  }, []);

  // ── Load dashboard ──
  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await budgetApi.getCurrent();
      if (res.success) {
        setDashData(res.data);
        if (!res.data) setShowBudgetSetup(true);
        else {
          setIncome(res.data.budget.totalIncome);
          setSavingsGoal(res.data.budget.savingsGoal);
        }
      }
    } catch {
      toast.error('加载数据失败');
    } finally {
      setDashLoading(false);
    }
  }, []);

  // ── Load daily budget details ──
  const loadDailyDetails = useCallback(async (year: number, month: number) => {
    setDailyDetailsLoading(true);
    try {
      const res = await budgetApi.getDailyDetails(year, month);
      if (res.success && res.data) {
        setDailyDetails(res.data.dailyDetails);
      }
    } catch {
      toast.error('加载每日预算明细失败');
    } finally {
      setDailyDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const now = new Date();
    loadDailyDetails(now.getFullYear(), now.getMonth() + 1);
  }, [loadDashboard, loadDailyDetails]);

  // ── Load history ──
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const [expRes, savRes] = await Promise.all([
        expenseApi.getAll(100),
        savingsApi.getAll(),
      ]);
      if (expRes.success) setExpenses(expRes.data);
      if (savRes.success) setSavings(savRes.data);
    } catch {
      toast.error('加载历史记录失败');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'history') loadHistory();
  }, [view, loadHistory]);

  // ── Load emergency fund info ──
  const loadEfInfo = useCallback(async () => {
    try {
      const res = await emergencyFundApi.getInfo();
      if (res.success && res.data) {
        setEfInfo(res.data);
        setEfTargetAmount(res.data.targetAmount);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (view === 'emergency') loadEfInfo();
  }, [view, loadEfInfo]);

  // ── Load stats ──
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await budgetApi.getMonthlySummary(statsYear, statsMonth);
      if (res.success) setStatsData(res.data);
    } catch {
      toast.error('加载统计数据失败');
    } finally {
      setStatsLoading(false);
    }
  }, [statsYear, statsMonth]);

  useEffect(() => {
    if (view === 'stats') loadStats();
  }, [view, loadStats]);

  // ── Submit expense ──
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || !expCategory) {
      toast.error('请填写金额和分类');
      return;
    }
    const amount = parseFloat(expAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('请输入有效金额');
      return;
    }
    setExpLoading(true);
    try {
      const res = await expenseApi.create(amount, expCategory, expNote || undefined);
      if (res.success) {
        toast.success(`已记录支出 ${fmtShort(amount)} 🎉`);
        // 检查是否超预算
        if (res.data?.exceededBudget) {
          toast.warning('⚠️ 本月预算已超支，请注意控制支出！');
        }
        setExpAmount('');
        setExpCategory('');
        setExpNote('');
        await loadDashboard();
      } else {
        toast.error(res.message || '记录失败');
      }
    } catch {
      toast.error('记录失败，请重试');
    } finally {
      setExpLoading(false);
    }
  };

  // ── Submit budget ──
  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inc = parseFloat(income);
    const goal = parseFloat(savingsGoal);
    if (isNaN(inc) || inc <= 0) { toast.error('请输入有效收入'); return; }
    if (isNaN(goal) || goal < 0) { toast.error('请输入有效存钱目标'); return; }
    if (goal >= inc) { toast.error('存钱目标必须小于总收入'); return; }
    setBudgetLoading(true);
    try {
      const res = await budgetApi.createOrUpdate(inc, goal);
      if (res.success) {
        toast.success('预算设置成功！');
        setShowBudgetSetup(false);
        setAiPlanResult(null);
        setUseAIPlan(false);
        await loadDashboard();
      } else {
        toast.error(res.message || '设置失败');
      }
    } catch {
      toast.error('设置失败，请重试');
    } finally {
      setBudgetLoading(false);
    }
  };

  // ── AI智能预算规划 ──
  const handleAIPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const inc = parseFloat(income);
    if (isNaN(inc) || inc <= 0) { toast.error('请输入有效收入'); return; }
    setBudgetLoading(true);
    try {
      const res = await budgetApi.aiPlan(inc);
      if (res.success) {
        const plan = res.data.aiPlan;
        setAiPlanResult({
          suggestedSavings: plan.suggestedSavings,
          monthlyBudget: plan.monthlyBudget,
          dailyBudget: plan.dailyBudget,
          summary: plan.summary,
          advice: plan.advice,
          suggestions: plan.suggestions,
        });
        setUseAIPlan(true);
        toast.success('🤖 豆包AI已为您制定预算计划！');
      } else {
        toast.error(res.message || 'AI规划失败');
      }
    } catch (error) {
      console.error('AI规划错误:', error);
      toast.error('AI服务暂时不可用，请稍后重试');
    } finally {
      setBudgetLoading(false);
    }
  };

  // ── 使用AI规划的预算 ──
  const handleUseAIPlan = async () => {
    if (!aiPlanResult) return;
    setBudgetLoading(true);
    try {
      const res = await budgetApi.createOrUpdate(
        parseFloat(income),
        aiPlanResult.suggestedSavings
      );
      if (res.success) {
        toast.success('🤖 AI预算已应用成功！');
        setShowBudgetSetup(false);
        setAiPlanResult(null);
        setUseAIPlan(false);
        await loadDashboard();
      } else {
        toast.error(res.message || '设置失败');
      }
    } catch {
      toast.error('设置失败，请重试');
    } finally {
      setBudgetLoading(false);
    }
  };

  // ── Emergency fund actions ──
  const handleEfVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!efPassword) { toast.error('请输入密码'); return; }
    setEfLoading(true);
    try {
      const res = await emergencyFundApi.verify(efPassword);
      if (res.success && res.data) {
        setEfUnlocked(true);
        setEfBalance(res.data.fund.balance);
        setEfTransactions(res.data.transactions);
        setEfPassword('');
        toast.success('验证成功！');
      } else {
        if (res.locked) {
          setEfLocked(true);
          toast.error('账户已锁定10分钟');
        } else {
          setEfRemainingAttempts(res.remainingAttempts ?? 5);
          toast.error(res.message || '密码错误');
        }
      }
    } catch {
      toast.error('验证失败');
    } finally {
      setEfLoading(false);
    }
  };

  const handleEfSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (efNewPassword !== efConfirmPassword) { toast.error('两次密码不一致'); return; }
    if (efNewPassword.length < 8) { toast.error('密码至少需要8位字符'); return; }
    const hasUpper = /[A-Z]/.test(efNewPassword);
    const hasLower = /[a-z]/.test(efNewPassword);
    const hasNumber = /[0-9]/.test(efNewPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(efNewPassword);
    if (!hasUpper || !hasLower || !hasNumber || !hasSymbol) {
      toast.error('密码必须包含大小写字母、数字和符号');
      return;
    }
    setEfLoading(true);
    try {
      const res = await emergencyFundApi.setPassword(efNewPassword);
      if (res.success) {
        toast.success('备用金密码设置成功！');
        setEfNewPassword('');
        setEfConfirmPassword('');
        setShowSetPassword(false);
        await loadEfInfo();
      } else {
        toast.error(res.message || '设置失败');
      }
    } catch {
      toast.error('设置失败');
    } finally {
      setEfLoading(false);
    }
  };

  const handleEfDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(efDepositAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('请输入有效金额'); return; }
    setEfLoading(true);
    try {
      const res = await emergencyFundApi.deposit(amount);
      if (res.success) {
        toast.success(`已存入备用金 ${fmtShort(amount)} 🔐`);
        setEfDepositAmount('');
        if (efUnlocked) {
          setEfBalance(res.data.balance);
          void emergencyFundApi.verify(efPassword);
          // Refresh transactions silently
        }
        await loadEfInfo();
      } else {
        toast.error(res.message || '存入失败');
      }
    } catch {
      toast.error('存入失败');
    } finally {
      setEfLoading(false);
    }
  };

  const handleEfWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(efWithdrawAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('请输入有效金额'); return; }
    if (!efWithdrawPassword) { toast.error('请输入密码'); return; }
    setEfLoading(true);
    try {
      const res = await emergencyFundApi.withdraw(amount, efWithdrawPassword, efWithdrawReason);
      if (res.success) {
        toast.success(`已取出 ${fmtShort(amount)}，已加入今日额度`);
        setEfWithdrawAmount('');
        setEfWithdrawPassword('');
        setEfWithdrawReason('');
        setShowWithdrawForm(false);
        setEfBalance(res.data.fund.balance);
        await loadDashboard();
      } else {
        if (res.locked) {
          setEfLocked(true);
          toast.error('账户已锁定10分钟');
        } else {
          toast.error(res.message || '取出失败');
        }
      }
    } catch {
      toast.error('取出失败');
    } finally {
      setEfLoading(false);
    }
  };

  const handleEfUpdateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(efTargetAmount);
    if (isNaN(target) || target <= 0) { toast.error('请输入有效目标金额'); return; }
    setEfLoading(true);
    try {
      const res = await emergencyFundApi.updateTarget(target);
      if (res.success) {
        toast.success('目标金额已更新');
        await loadEfInfo();
      } else {
        toast.error(res.message || '更新失败');
      }
    } catch {
      toast.error('更新失败');
    } finally {
      setEfLoading(false);
    }
  };

  // ── Nav items ──
  const navItems: { id: AppView; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: '首页',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'history',
      label: '历史',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'stats',
      label: '统计',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'emergency',
      label: '备用金',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: '设置',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const navigate = (v: AppView) => {
    setView(v);
    setMobileMenuOpen(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER VIEWS
  // ─────────────────────────────────────────────────────────────────────────

  const renderDashboard = () => {
    if (dashLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3 animate-pulse">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm">加载中...</p>
          </div>
        </div>
      );
    }

    // Budget setup modal
    if (showBudgetSetup || !dashData) {
      return (
        <div className="max-w-lg mx-auto">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <h2 className="font-heading font-bold text-2xl text-foreground">设置本月预算</h2>
              <p className="text-muted-foreground text-sm mt-2">
                {new Date().getFullYear()}年{new Date().getMonth() + 1}月 · 输入收入，Kimi AI为您智能分配
              </p>
            </div>
            
            {/* AI规划结果展示 */}
            {aiPlanResult && (
              <div className="mb-6 bg-gradient-to-r from-[oklch(0.95_0.02_180)] to-[oklch(0.95_0.02_220)] border border-primary/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🤖</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Kimi AI预算规划</h3>
                    <p className="text-sm text-muted-foreground mt-1">{aiPlanResult.summary}</p>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div className="bg-white rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">建议储蓄</p>
                        <p className="font-bold text-primary">{fmtShort(aiPlanResult.suggestedSavings)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">月度预算</p>
                        <p className="font-bold text-secondary">{fmtShort(aiPlanResult.monthlyBudget)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">日均预算</p>
                        <p className="font-bold text-accent">{fmtShort(aiPlanResult.dailyBudget)}</p>
                      </div>
                    </div>
                    <div className="mt-3 bg-white/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-2">📝 理财建议</p>
                      <p className="text-sm text-foreground">{aiPlanResult.advice}</p>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-2">📅 每日预算分配</p>
                      <div className="grid grid-cols-7 gap-1">
                        {aiPlanResult.suggestions.map((s, idx) => (
                          <div key={idx} className="text-center bg-white rounded p-1">
                            <p className="text-xs text-muted-foreground">{s.dayName}</p>
                            <p className="text-xs font-semibold">{fmtShort(s.suggestedAmount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleUseAIPlan}
                        disabled={budgetLoading}
                        className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium text-sm hover:opacity-90 transition-all disabled:opacity-60"
                      >
                        {budgetLoading ? '应用中...' : '✓ 应用AI预算'}
                      </button>
                      <button
                        onClick={() => { setAiPlanResult(null); setUseAIPlan(false); }}
                        className="px-4 py-2 bg-background border border-border text-muted-foreground rounded-lg font-medium text-sm hover:border-primary transition-all"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">本月总收入 (元)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">¥</span>
                  <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="3000"
                    min="1"
                    className="w-full pl-8 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 font-mono"
                  />
                </div>
              </div>
              
              {!useAIPlan && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">本月存钱目标 (元)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">¥</span>
                    <input
                      type="number"
                      value={savingsGoal}
                      onChange={(e) => setSavingsGoal(e.target.value)}
                      placeholder="500"
                      min="0"
                      className="w-full pl-8 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 font-mono"
                    />
                  </div>
                </div>
              )}
              
              {!useAIPlan && income && savingsGoal && parseFloat(income) > parseFloat(savingsGoal) && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold text-primary">每日可用额度：</span>
                    {fmtShort((parseFloat(income) - parseFloat(savingsGoal)) / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    可用预算 {fmtShort(parseFloat(income) - parseFloat(savingsGoal))} ÷ {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} 天
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                {!aiPlanResult && (
                  <>
                    <button
                      type="button"
                      onClick={handleAIPlan}
                      disabled={budgetLoading || !income}
                      className="flex-1 bg-gradient-to-r from-[oklch(0.65_0.14_280)] to-[oklch(0.65_0.18_220)] text-white py-3 rounded-xl font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 shadow-md disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
                    >
                      {budgetLoading ? 'AI思考中...' : '🤖 让Kimi AI规划'}
                    </button>
                    {!useAIPlan && (
                      <button
                        type="submit"
                        onClick={handleBudgetSubmit}
                        disabled={budgetLoading || !income || !savingsGoal}
                        className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 shadow-md disabled:opacity-60 disabled:translate-y-0"
                      >
                        {budgetLoading ? '设置中...' : '手动设置'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      );
    }

    const d = dashData;
    const budget = d.budget;
    const dailyAllowance = d.dailyAllowance; // 使用后端智能计算的每日预算
    const savingsGoalNum = parseFloat(budget.savingsGoal);
    const totalIncome = parseFloat(budget.totalIncome);
    const savingsPct = savingsGoalNum > 0 ? Math.min(100, (d.totalSavings / savingsGoalNum) * 100) : 0;

    // 检查超预算状态
    const todayExceeded = d.todayExpenses > dailyAllowance;
    const monthExceeded = d.exceededBudget || false;

    return (
      <div className="space-y-6">
        {/* Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">今日概览</p>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
              你好，{userName || '同学'} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              今天是本月第{d.dayOfMonth}天 · {today()}
            </p>
            {/* 超预算警告 */}
            {(todayExceeded || monthExceeded) && (
              <div className="mt-2 inline-flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg text-sm font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {todayExceeded ? '今日预算已超支，请注意控制支出！' : '本月预算已超支，请注意控制支出！'}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              记录支出
            </button>
            <button
              onClick={() => navigate('stats')}
              className="flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2.5 rounded-xl font-semibold text-sm hover:border-primary hover:text-primary transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              查看统计
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="今日可用额度"
            value={fmtShort(d.todayRemaining)}
            sub={`已花费 ${fmtShort(d.todayExpenses)} · 额度 ${fmtShort(dailyAllowance)} ${d.smartAllocation ? '🤖 AI智能分配' : ''}`}
            progress={d.todayExpenses}
            progressMax={dailyAllowance}
            gradient
            icon={
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="本月预算"
            value={fmtShort(budget.availableBudget)}
            sub={`总收入 ${fmtShort(totalIncome)} · 目标存 ${fmtShort(savingsGoalNum)}`}
            progress={d.totalExpenses}
            progressMax={parseFloat(budget.availableBudget)}
            progressColor="bg-secondary"
            icon={
              <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            }
          />
          <StatCard
            label="强制储蓄"
            value={fmtShort(d.totalSavings)}
            sub={`目标 ${fmtShort(savingsGoalNum)} · 进度 ${Math.round(savingsPct)}%`}
            progress={d.totalSavings}
            progressMax={savingsGoalNum}
            progressColor="bg-[oklch(0.65_0.18_145)]"
            icon={
              <svg className="w-4 h-4 text-[oklch(0.65_0.18_145)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <StatCard
            label="备用金账户"
            value={efBalance !== null ? fmtShort(efBalance) : '¥***'}
            sub={`目标 ${fmtShort(efInfo?.targetAmount || 1000)} · 🔐 需密码查看`}
            icon={
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Expense Form + Category Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            {/* Expense Form */}
            <div id="expense-form" className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-heading font-semibold text-lg text-foreground">记录今日支出</h2>
                  <p className="text-muted-foreground text-sm">今日剩余 {fmtShort(d.todayRemaining)} 将自动存入储蓄</p>
                </div>
                <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                  今日可用 {fmtShort(dailyAllowance)}
                </span>
              </div>
              <form onSubmit={handleExpenseSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">支出金额 (元)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">¥</span>
                      <input
                        type="number"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        className="w-full pl-8 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">消费分类</label>
                    <select
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 appearance-none"
                    >
                      <option value="">选择分类...</option>
                      <option value="food">🍜 餐饮</option>
                      <option value="shopping">🛍️ 购物</option>
                      <option value="transport">🚌 交通</option>
                      <option value="entertainment">🎮 娱乐</option>
                      <option value="study">📚 学习</option>
                      <option value="other">📦 其他</option>
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-1.5">备注 (可选)</label>
                  <input
                    type="text"
                    value={expNote}
                    onChange={(e) => setExpNote(e.target.value)}
                    placeholder="今天吃了什么？买了什么？"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={expLoading}
                    className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 shadow-md disabled:opacity-60 disabled:translate-y-0"
                  >
                    {expLoading ? '记录中...' : '✓ 确认记录'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExpAmount(''); setExpCategory(''); setExpNote(''); }}
                    className="px-4 py-2.5 bg-background border border-border text-muted-foreground rounded-xl font-medium text-sm hover:border-primary transition-all duration-200"
                  >
                    清空
                  </button>
                </div>
              </form>
            </div>

            {/* Category Breakdown */}
            {d.categoryBreakdown.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-heading font-semibold text-lg text-foreground">本月支出分类</h2>
                    <p className="text-muted-foreground text-sm">{monthLabel(budget.year, budget.month)}</p>
                  </div>
                  <button onClick={() => navigate('stats')} className="text-xs font-medium text-primary hover:underline">查看详情 →</button>
                </div>
                <div className="space-y-3">
                  {d.categoryBreakdown.map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.other;
                    const total = d.categoryBreakdown.reduce((s, c) => s + parseFloat(c.total), 0);
                    const pct = total > 0 ? Math.round((parseFloat(cat.total) / total) * 100) : 0;
                    const barColors: Record<string, string> = {
                      food: 'bg-orange-400', shopping: 'bg-purple-400', transport: 'bg-blue-400',
                      entertainment: 'bg-green-400', study: 'bg-indigo-400', other: 'bg-gray-400',
                    };
                    return (
                      <div key={cat.category} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${cfg.bgColor} flex items-center justify-center text-base flex-shrink-0`}>
                          {cfg.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-foreground">{cfg.label}</span>
                            <span className="text-sm font-semibold font-mono text-foreground">{fmtShort(cat.total)}</span>
                          </div>
                          <div className="bg-muted rounded-full h-2">
                            <div
                              className={`${barColors[cat.category] || 'bg-gray-400'} rounded-full h-2 transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Savings Progress + Emergency Fund + Recent */}
          <div className="space-y-6">
            {/* Savings Progress */}
            <div className="bg-gradient-to-br from-secondary to-[oklch(0.48_0.19_264)] rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <h2 className="font-heading font-semibold text-base">强制储蓄进度</h2>
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-white/70 text-xs">已存金额</p>
                    <p className="font-heading font-bold text-4xl">{fmtShort(d.totalSavings)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/70 text-xs">本月目标</p>
                    <p className="font-bold text-xl">{fmtShort(savingsGoalNum)}</p>
                  </div>
                </div>
                <div className="bg-white/20 rounded-full h-3 mb-2">
                  <div
                    className="bg-white rounded-full h-3 transition-all duration-700"
                    style={{ width: `${savingsPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-white/70 text-xs">
                  <span>0%</span>
                  <span className="font-semibold text-white">{Math.round(savingsPct)}% 完成</span>
                  <span>100%</span>
                </div>
              </div>
              {d.todayRemaining > 0 && (
                <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                  <p className="text-white/80 text-xs">🎉 今日剩余 {fmtShort(d.todayRemaining)}，记录支出后自动存入！</p>
                  <p className="text-white/60 text-xs mt-0.5">
                    {savingsGoalNum - d.totalSavings > 0
                      ? `再存 ${fmtShort(savingsGoalNum - d.totalSavings)} 即可达成目标`
                      : '🎊 本月目标已达成！'}
                  </p>
                </div>
              )}
            </div>

            {/* Emergency Fund Quick */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h2 className="font-heading font-semibold text-base text-foreground">备用金账户</h2>
              </div>
              <div className="bg-background rounded-xl p-4 mb-4 border border-border">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-muted-foreground text-xs">当前余额</p>
                    <p className="font-heading font-bold text-2xl text-foreground">
                      {efBalance !== null ? fmtShort(efBalance) : '¥ *** '}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <span className="text-xl">🔐</span>
                  </div>
                </div>
                {efBalance !== null && efInfo && (
                  <>
                    <ProgressBar
                      value={parseFloat(efBalance)}
                      max={parseFloat(efInfo.targetAmount)}
                      color="bg-accent"
                    />
                    <p className="text-muted-foreground text-xs mt-1">
                      目标 {fmtShort(efInfo.targetAmount)} · 已完成 {efInfo ? Math.round((parseFloat(efBalance) / parseFloat(efInfo.targetAmount)) * 100) : 0}%
                    </p>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">存入金额 (免密)</label>
                  <form onSubmit={handleEfDeposit} className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                      <input
                        type="number"
                        value={efDepositAmount}
                        onChange={(e) => setEfDepositAmount(e.target.value)}
                        placeholder="50"
                        min="0.01"
                        step="0.01"
                        className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary transition-all duration-200 font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={efLoading}
                      className="px-3 py-2 bg-[oklch(0.65_0.18_145)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all duration-200 disabled:opacity-60"
                    >
                      存入
                    </button>
                  </form>
                </div>
                <button
                  onClick={() => navigate('emergency')}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:border-accent hover:text-accent transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  查看余额 (需密码)
                </button>
              </div>
            </div>

            {/* Recent Records */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-semibold text-base text-foreground">近期记录</h2>
                <button onClick={() => navigate('history')} className="text-xs font-medium text-primary hover:underline">全部 →</button>
              </div>
              {d.dailyTrend.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">暂无记录</p>
              ) : (
                <div className="space-y-3">
                  {d.dailyTrend.slice(-4).reverse().map((day, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm flex-shrink-0">
                        📅
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{day.date}</p>
                        <p className="text-xs text-muted-foreground">当日支出</p>
                      </div>
                      <span className="text-sm font-semibold font-mono text-destructive flex-shrink-0">
                        -{fmtShort(day.totalExpense)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Trend Chart */}
        {d.dailyTrend.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-heading font-semibold text-lg text-foreground">本月每日额度使用趋势</h2>
                <p className="text-muted-foreground text-sm">{monthLabel(budget.year, budget.month)} · 每日额度 {fmtShort(dailyAllowance)}</p>
              </div>
              <div className="flex gap-3">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded-sm bg-primary inline-block" />支出
                </span>
              </div>
            </div>
            <div className="flex items-end gap-1 sm:gap-2 h-32 overflow-x-auto pb-1">
              {d.dailyTrend.map((day, i) => {
                const exp = parseFloat(day.totalExpense);
                const heightPct = dailyAllowance > 0 ? Math.min(100, (exp / dailyAllowance) * 100) : 0;
                const isToday = i === d.dailyTrend.length - 1;
                return (
                  <div key={i} className="flex-1 min-w-[20px] flex flex-col items-center gap-1 relative">
                    {isToday && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                        今天
                      </div>
                    )}
                    <div
                      className={`w-full flex flex-col justify-end rounded-md ${
                        isToday ? 'border-2 border-primary' : ''
                      }`}
                      style={{ height: '100px' }}
                    >
                      <div
                        className={`w-full rounded-t-sm ${
                          isToday ? 'bg-primary/60' : 'bg-primary'
                        }`}
                        style={{ height: `${heightPct}px` }}
                      />
                    </div>
                    <span className={`text-xs ${
                      isToday ? 'text-primary font-semibold' : 'text-muted-foreground'
                    }`}>
                      {new Date(day.date).getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Monthly Settings */}
        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-border rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎯</span>
                <h2 className="font-heading font-semibold text-lg text-foreground">月度设置</h2>
              </div>
              <p className="text-muted-foreground text-sm">调整本月收入和存钱目标，系统将重新计算每日额度。</p>
            </div>
            <form onSubmit={handleBudgetSubmit} className="flex flex-col sm:flex-row gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">本月总收入 (元)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                  <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    className="pl-7 pr-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary transition-all duration-200 w-32 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">存钱目标 (元)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                  <input
                    type="number"
                    value={savingsGoal}
                    onChange={(e) => setSavingsGoal(e.target.value)}
                    className="pl-7 pr-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary transition-all duration-200 w-32 font-mono"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={budgetLoading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-all duration-200 disabled:opacity-60"
                >
                  {budgetLoading ? '更新中...' : '更新设置'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Daily Budget Details */}
        {dailyDetails.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-heading font-semibold text-lg text-foreground">📅 本月每日预算明细</h2>
                <p className="text-muted-foreground text-sm">每日可用额度与实际支出</p>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-primary" />可用额度
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-destructive" />已支出
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500" />剩余
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">日期</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">星期</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">可用额度</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">已支出</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">剩余</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyDetails.map((item) => (
                    <tr
                      key={item.day}
                      className={`border-b border-border last:border-0 transition-colors ${
                        item.isToday ? 'bg-primary/5' : 'hover:bg-muted/30'
                      }`}
                    >
                      <td className={`py-3 px-2 font-medium ${
                        item.isToday ? 'text-primary font-semibold' : 'text-foreground'
                      }`}>
                        {item.day}日
                        {item.isToday && <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">今天</span>}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {item.dayName}
                      </td>
                      <td className="py-3 px-2 text-right font-mono">
                        {item.dailyAllowance.toFixed(2)}
                      </td>
                      <td className={`py-3 px-2 text-right font-mono ${
                        item.dayExpenses > 0 ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {item.dayExpenses.toFixed(2)}
                      </td>
                      <td className={`py-3 px-2 text-right font-mono font-semibold ${
                        item.remaining < 0 ? 'text-destructive' : 'text-green-600'
                      }`}>
                        {item.remaining.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── History View ──
  const renderHistory = () => (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">历史记录</h1>
        <p className="text-muted-foreground text-sm mt-1">查看所有支出和储蓄记录</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setHistoryTab('expenses')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
            historyTab === 'expenses'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary'
          }`}
        >
          支出记录
        </button>
        <button
          onClick={() => setHistoryTab('savings')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
            historyTab === 'savings'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary'
          }`}
        >
          储蓄记录
        </button>
      </div>

      {historyLoading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : historyTab === 'expenses' ? (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">📭</span>
              <p className="text-muted-foreground mt-3">暂无支出记录</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {expenses.map((exp) => {
                const cfg = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.other;
                return (
                  <div key={exp.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bgColor} flex items-center justify-center text-lg flex-shrink-0`}>
                      {cfg.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {cfg.label}{exp.note ? ` · ${exp.note}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(exp.expenseDate).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-sm font-semibold font-mono text-destructive flex-shrink-0">
                      -{fmtShort(exp.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {savings.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">🏦</span>
              <p className="text-muted-foreground mt-3">暂无储蓄记录</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {savings.map((rec) => (
                <div key={rec.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-lg flex-shrink-0">
                    {rec.type === 'auto' ? '💰' : '🏦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {rec.type === 'auto' ? '自动存入储蓄' : '手动存入'}
                      {rec.note ? ` · ${rec.note}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(rec.recordDate).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold font-mono text-[oklch(0.65_0.18_145)] flex-shrink-0">
                    +{fmtShort(rec.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Stats View ──
  const renderStats = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">统计分析</h1>
          <p className="text-muted-foreground text-sm mt-1">月度收支趋势与分类统计</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statsYear}
            onChange={(e) => setStatsYear(parseInt(e.target.value))}
            className="px-3 py-2 bg-card border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary transition-all"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <select
            value={statsMonth}
            onChange={(e) => setStatsMonth(parseInt(e.target.value))}
            className="px-3 py-2 bg-card border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary transition-all"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}月</option>
            ))}
          </select>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
          >
            查询
          </button>
        </div>
      </div>

      {statsLoading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : !statsData ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
          <span className="text-5xl">📊</span>
          <p className="text-foreground font-semibold mt-4">{statsYear}年{statsMonth}月暂无数据</p>
          <p className="text-muted-foreground text-sm mt-2">该月份还没有设置预算或记录支出</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">总收入</p>
              <p className="font-heading font-bold text-2xl text-foreground">{fmtShort(statsData.budget.totalIncome)}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">总支出</p>
              <p className="font-heading font-bold text-2xl text-destructive">{fmtShort(statsData.totalExpenses)}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">总储蓄</p>
              <p className="font-heading font-bold text-2xl text-[oklch(0.65_0.18_145)]">{fmtShort(statsData.totalSavings)}</p>
            </div>
          </div>

          {/* Category Breakdown */}
          {statsData.categoryBreakdown.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="font-heading font-semibold text-lg text-foreground mb-5">支出分类统计</h2>
              <div className="space-y-4">
                {statsData.categoryBreakdown.map((cat: { category: string; total: string; count: number }) => {
                  const cfg = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.other;
                  const total = statsData.categoryBreakdown.reduce((s: number, c: { total: string }) => s + parseFloat(c.total), 0);
                  const pct = total > 0 ? Math.round((parseFloat(cat.total) / total) * 100) : 0;
                  const barColors: Record<string, string> = {
                    food: 'bg-orange-400', shopping: 'bg-purple-400', transport: 'bg-blue-400',
                    entertainment: 'bg-green-400', study: 'bg-indigo-400', other: 'bg-gray-400',
                  };
                  return (
                    <div key={cat.category} className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${cfg.bgColor} flex items-center justify-center text-lg flex-shrink-0`}>
                        {cfg.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-medium text-foreground">{cfg.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{cat.count}笔</span>
                            <span className="text-sm font-semibold font-mono text-foreground">{fmtShort(cat.total)}</span>
                          </div>
                        </div>
                        <div className="bg-muted rounded-full h-2.5">
                          <div
                            className={`${barColors[cat.category] || 'bg-gray-400'} rounded-full h-2.5 transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily Trend */}
          {statsData.dailyTrend.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="font-heading font-semibold text-lg text-foreground mb-5">
                每日支出趋势 · {statsYear}年{statsMonth}月
              </h2>
              <div className="flex items-end gap-1 h-40 overflow-x-auto pb-1">
                {statsData.dailyTrend.map((day: { date: string; totalExpense: string }, i: number) => {
                  const exp = parseFloat(day.totalExpense);
                  const maxExp = Math.max(...statsData.dailyTrend.map((d: { totalExpense: string }) => parseFloat(d.totalExpense)), 1);
                  const heightPct = (exp / maxExp) * 100;
                  return (
                    <div key={i} className="flex-1 min-w-[16px] flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col justify-end" style={{ height: '120px' }}>
                        <div
                          className="w-full bg-primary rounded-t-sm"
                          style={{ height: `${heightPct}%` }}
                          title={`${day.date}: ${fmtShort(exp)}`}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(day.date).getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── Emergency Fund View ──
  const renderEmergency = () => (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">备用金账户</h1>
        <p className="text-muted-foreground text-sm mt-1">密码保护的紧急资金，防止冲动消费</p>
      </div>

      {/* Set Password */}
      {!efInfo?.hasPassword && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">尚未设置备用金密码</h3>
              <p className="text-amber-700 text-sm mt-1">设置强密码后，查看余额和取出资金都需要验证，有效防止冲动消费。</p>
              <button
                onClick={() => setShowSetPassword(true)}
                className="mt-3 px-4 py-2 bg-accent text-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
              >
                立即设置密码
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Password Form */}
      {showSetPassword && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-heading font-semibold text-lg text-foreground mb-4">设置备用金密码</h2>
          <p className="text-muted-foreground text-sm mb-4">密码要求：8位以上，包含大小写字母、数字和符号</p>
          <form onSubmit={handleEfSetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">新密码</label>
              <input
                type="password"
                value={efNewPassword}
                onChange={(e) => setEfNewPassword(e.target.value)}
                placeholder="至少8位，含大小写字母、数字和符号"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">确认密码</label>
              <input
                type="password"
                value={efConfirmPassword}
                onChange={(e) => setEfConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={efLoading}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60"
              >
                {efLoading ? '设置中...' : '确认设置'}
              </button>
              <button
                type="button"
                onClick={() => setShowSetPassword(false)}
                className="px-4 py-2.5 bg-background border border-border text-muted-foreground rounded-xl text-sm hover:border-primary transition-all"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Deposit (no password) */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="font-heading font-semibold text-lg text-foreground mb-2">存入备用金</h2>
        <p className="text-muted-foreground text-sm mb-4">存入无需密码，鼓励随时储蓄</p>
        <form onSubmit={handleEfDeposit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
            <input
              type="number"
              value={efDepositAmount}
              onChange={(e) => setEfDepositAmount(e.target.value)}
              placeholder="输入存入金额"
              min="0.01"
              step="0.01"
              className="w-full pl-8 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={efLoading}
            className="px-6 py-2.5 bg-[oklch(0.65_0.18_145)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60"
          >
            {efLoading ? '存入中...' : '💰 存入'}
          </button>
        </form>
      </div>

      {/* Update Target */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="font-heading font-semibold text-lg text-foreground mb-2">目标金额</h2>
        <p className="text-muted-foreground text-sm mb-4">当前目标：{fmtShort(efInfo?.targetAmount || 1000)}</p>
        <form onSubmit={handleEfUpdateTarget} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
            <input
              type="number"
              value={efTargetAmount}
              onChange={(e) => setEfTargetAmount(e.target.value)}
              placeholder="1000"
              min="1"
              className="w-full pl-8 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={efLoading}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60"
          >
            更新目标
          </button>
        </form>
      </div>

      {/* Verify Password & View Balance */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="font-heading font-semibold text-base text-foreground">备用金安全验证</h2>
            <p className="text-muted-foreground text-sm">输入专用密码以查看余额或取出资金</p>
          </div>
        </div>

        {efLocked ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <p className="text-destructive font-semibold text-sm">🔒 账户已锁定</p>
            <p className="text-destructive/70 text-xs mt-1">连续5次密码错误，请10分钟后再试</p>
          </div>
        ) : !efUnlocked ? (
          <>
            <div className="bg-background border border-border rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs font-medium text-muted-foreground">
                  连续5次错误将锁定10分钟 · 剩余尝试次数：
                  <span className="font-bold text-foreground">{efRemainingAttempts}次</span>
                </p>
              </div>
              <form onSubmit={handleEfVerify} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">备用金专用密码</label>
                  <input
                    type="password"
                    value={efPassword}
                    onChange={(e) => setEfPassword(e.target.value)}
                    placeholder="请输入8位以上强密码"
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    disabled={efLoading}
                    className="flex-1 py-2 bg-accent text-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60"
                  >
                    {efLoading ? '验证中...' : '🔓 验证密码'}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <>
            {/* Unlocked state */}
            <div className="bg-[oklch(0.65_0.18_145)]/10 border border-[oklch(0.65_0.18_145)]/20 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">当前余额</p>
                  <p className="font-heading font-bold text-3xl text-foreground">{fmtShort(efBalance || 0)}</p>
                </div>
                <button
                  onClick={() => { setEfUnlocked(false); setEfBalance(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  🔒 锁定
                </button>
              </div>
              {efInfo && (
                <>
                  <ProgressBar
                    value={parseFloat(efBalance || '0')}
                    max={parseFloat(efInfo.targetAmount)}
                    color="bg-[oklch(0.65_0.18_145)]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    目标 {fmtShort(efInfo.targetAmount)} · 已完成 {Math.round((parseFloat(efBalance || '0') / parseFloat(efInfo.targetAmount)) * 100)}%
                  </p>
                </>
              )}
            </div>

            {/* Withdraw */}
            <div className="mb-4">
              <button
                onClick={() => setShowWithdrawForm(!showWithdrawForm)}
                className="flex items-center gap-2 text-sm font-semibold text-destructive hover:opacity-80 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {showWithdrawForm ? '取消取出' : '取出资金（需密码）'}
              </button>
              {showWithdrawForm && (
                <form onSubmit={handleEfWithdraw} className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">取出金额</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                        <input
                          type="number"
                          value={efWithdrawAmount}
                          onChange={(e) => setEfWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          min="0.01"
                          step="0.01"
                          className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">确认密码</label>
                      <input
                        type="password"
                        value={efWithdrawPassword}
                        onChange={(e) => setEfWithdrawPassword(e.target.value)}
                        placeholder="备用金密码"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">取用原因 (可选)</label>
                    <input
                      type="text"
                      value={efWithdrawReason}
                      onChange={(e) => setEfWithdrawReason(e.target.value)}
                      placeholder="紧急情况说明..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={efLoading}
                    className="w-full py-2.5 bg-destructive text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60"
                  >
                    {efLoading ? '处理中...' : '确认取出'}
                  </button>
                </form>
              )}
            </div>

            {/* Transactions */}
            {efTransactions.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-foreground mb-3">交易记录</h3>
                <div className="space-y-2">
                  {efTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                        tx.type === 'deposit' ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        {tx.type === 'deposit' ? '💰' : '💸'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {tx.type === 'deposit' ? '存入' : '取出'}
                          {tx.reason ? ` · ${tx.reason}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold font-mono flex-shrink-0 ${
                        tx.type === 'deposit' ? 'text-[oklch(0.65_0.18_145)]' : 'text-destructive'
                      }`}>
                        {tx.type === 'deposit' ? '+' : '-'}{fmtShort(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ── Settings View ──
  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">设置</h1>
        <p className="text-muted-foreground text-sm mt-1">账户与安全管理</p>
      </div>

      {/* Account Info */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="font-heading font-semibold text-lg text-foreground mb-4">账户信息</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
            {userName ? userName[0].toUpperCase() : '?'}
          </div>
          <div>
            <p className="font-semibold text-foreground text-lg">{userName || '用户'}</p>
            <p className="text-muted-foreground text-sm">大学生智能存钱系统用户</p>
          </div>
        </div>
      </div>

      {/* Monthly Budget Settings */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="font-heading font-semibold text-lg text-foreground mb-2">月度预算设置</h2>
        <p className="text-muted-foreground text-sm mb-5">修改本月收入和存钱目标</p>
        <form onSubmit={handleBudgetSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">本月总收入 (元)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="3000"
                  className="w-full pl-8 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">存钱目标 (元)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <input
                  type="number"
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value)}
                  placeholder="500"
                  className="w-full pl-8 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </div>
            </div>
          </div>
          {income && savingsGoal && parseFloat(income) > parseFloat(savingsGoal) && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-sm text-foreground">
                每日可用额度：<span className="font-semibold text-primary">
                  {fmtShort((parseFloat(income) - parseFloat(savingsGoal)) / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())}
                </span>
              </p>
            </div>
          )}
          <button
            type="submit"
            disabled={budgetLoading}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60"
          >
            {budgetLoading ? '保存中...' : '保存设置'}
          </button>
        </form>
      </div>

      {/* Emergency Fund Password */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="font-heading font-semibold text-lg text-foreground mb-2">备用金密码管理</h2>
        <p className="text-muted-foreground text-sm mb-5">
          {efInfo?.hasPassword ? '已设置备用金密码，可重新设置' : '尚未设置备用金密码'}
        </p>
        {!showSetPassword ? (
          <button
            onClick={() => setShowSetPassword(true)}
            className="px-4 py-2.5 bg-accent text-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-all"
          >
            {efInfo?.hasPassword ? '重新设置密码' : '设置备用金密码'}
          </button>
        ) : (
          <form onSubmit={handleEfSetPassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">新密码</label>
                <input
                  type="password"
                  value={efNewPassword}
                  onChange={(e) => setEfNewPassword(e.target.value)}
                  placeholder="8位以上，含大小写字母、数字和符号"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">确认密码</label>
                <input
                  type="password"
                  value={efConfirmPassword}
                  onChange={(e) => setEfConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={efLoading}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60"
              >
                {efLoading ? '设置中...' : '确认设置'}
              </button>
              <button
                type="button"
                onClick={() => setShowSetPassword(false)}
                className="px-4 py-2.5 bg-background border border-border text-muted-foreground rounded-xl text-sm hover:border-primary transition-all"
              >
                取消
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Reminder Settings */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="font-heading font-semibold text-lg text-foreground mb-4">提醒设置</h2>
        <ReminderSettings />
      </div>

      {/* Change Password */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="font-heading font-semibold text-lg text-foreground mb-2">修改密码</h2>
        <p className="text-muted-foreground text-sm mb-4">定期更换密码可以保护账户安全</p>
        <button
          onClick={() => { routerNavigate('/change-password'); }}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-all"
        >
          修改密码
        </button>
      </div>

      {/* Data Export */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="font-heading font-semibold text-lg text-foreground mb-4">数据管理</h2>
        <DataExport />
      </div>

      {/* Logout */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="font-heading font-semibold text-lg text-foreground mb-2">退出登录</h2>
        <p className="text-muted-foreground text-sm mb-4">退出后需要重新登录才能访问数据</p>
        <button
          onClick={() => { logout(); }}
          className="px-6 py-2.5 bg-destructive text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all"
        >
          退出登录
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-heading font-bold text-lg text-foreground tracking-tight">智能存钱</span>
              <span className="hidden sm:inline text-xs font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">v1.0</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    view === item.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right: User + Mobile Menu */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 bg-background border border-border rounded-full px-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                  {userName ? userName[0].toUpperCase() : '?'}
                </div>
                <span className="text-sm font-medium text-foreground">{userName || '用户'}</span>
              </div>
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all"
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    view === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'dashboard' && renderDashboard()}
        {view === 'history' && renderHistory()}
        {view === 'stats' && renderStats()}
        {view === 'emergency' && renderEmergency()}
        {view === 'settings' && renderSettings()}
      </main>

      {/* Bottom Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                view === item.id ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-8 mb-16 md:mb-0">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-foreground">大学生智能存钱系统</span>
              <span className="text-xs text-muted-foreground">v1.0</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>数据安全加密存储</span>
              <span>·</span>
              <span>© 2026 智能存钱</span>
            </div>
          </div>
        </div>
      </footer>

      <OmniflowBadge />
      <Toaster />
    </div>
  );
};

export default Index;
