import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { budgetRepository } from '../repositories/budgets';
import { aiService } from '../services/aiService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Get current month budget
router.get('/current', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const budget = await budgetRepository.findByUserAndMonth(userId, year, month);
    if (!budget) {
      res.json({ success: true, data: null });
      return;
    }

    const totalExpenses = await budgetRepository.getMonthlyExpenseTotal(userId, budget.id);
    const totalSavings = await budgetRepository.getMonthlySavingsTotal(userId, budget.id);
    const todayExpenses = await budgetRepository.getDailyExpenses(userId, now);
    const categoryBreakdown = await budgetRepository.getCategoryBreakdown(userId, budget.id);
    const dailyTrend = await budgetRepository.getDailyTrend(userId, budget.id);

    // 使用AI智能每日预算分配
    const smartDailyBudget = await budgetRepository.calculateDailyBudget(userId, now);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayOfMonth = now.getDate();
    const todayRemaining = Math.max(0, smartDailyBudget - todayExpenses);

    res.json({
      success: true,
      data: {
        budget,
        totalExpenses,
        totalSavings,
        todayExpenses,
        todayRemaining,
        dailyAllowance: smartDailyBudget, // 使用智能分配的每日预算
        categoryBreakdown,
        dailyTrend,
        daysInMonth,
        dayOfMonth,
        smartAllocation: true, // 标识使用了AI智能分配
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get all budgets for user
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const budgets = await budgetRepository.findAllByUser(userId);
    res.json({ success: true, data: budgets });
  } catch (error) {
    next(error);
  }
});

// Create or update monthly budget
router.post('/', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { totalIncome, savingsGoal, year, month } = req.body;

    const income = parseFloat(totalIncome);
    const goal = parseFloat(savingsGoal);

    if (isNaN(income) || income <= 0) throw new AppError('Invalid income amount', 400);
    if (isNaN(goal) || goal < 0) throw new AppError('Invalid savings goal', 400);
    if (goal >= income) throw new AppError('Savings goal must be less than income', 400);

    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const availableBudget = income - goal;
    const dailyAllowance = availableBudget / daysInMonth;

    const existing = await budgetRepository.findByUserAndMonth(userId, targetYear, targetMonth);

    let budget;
    if (existing) {
      budget = await budgetRepository.update(existing.id, {
        totalIncome: income.toFixed(2),
        savingsGoal: goal.toFixed(2),
        availableBudget: availableBudget.toFixed(2),
        dailyAllowance: dailyAllowance.toFixed(2),
      });
    } else {
      budget = await budgetRepository.create({
        userId,
        year: targetYear,
        month: targetMonth,
        totalIncome: income.toFixed(2),
        savingsGoal: goal.toFixed(2),
        availableBudget: availableBudget.toFixed(2),
        dailyAllowance: dailyAllowance.toFixed(2),
      });
    }

    res.json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
});

// AI智能预算规划 - 让豆包AI制定完整的月度预算计划
router.post('/ai-plan', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { totalIncome, year, month } = req.body;

    const income = parseFloat(totalIncome);
    if (isNaN(income) || income <= 0) throw new AppError('Invalid income amount', 400);

    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;

    // 获取用户历史消费模式
    const pastSpending = await budgetRepository.getWeeklySpendingPattern(userId);

    // 调用豆包AI制定预算计划
    const plan = await aiService.createMonthlyBudgetPlan(income, pastSpending);

    // 保存预算到数据库
    const existing = await budgetRepository.findByUserAndMonth(userId, targetYear, targetMonth);

    let budget;
    if (existing) {
      budget = await budgetRepository.update(existing.id, {
        totalIncome: plan.totalIncome.toFixed(2),
        savingsGoal: plan.suggestedSavings.toFixed(2),
        availableBudget: plan.monthlyBudget.toFixed(2),
        dailyAllowance: plan.dailyBudget.toFixed(2),
      });
    } else {
      budget = await budgetRepository.create({
        userId,
        year: targetYear,
        month: targetMonth,
        totalIncome: plan.totalIncome.toFixed(2),
        savingsGoal: plan.suggestedSavings.toFixed(2),
        availableBudget: plan.monthlyBudget.toFixed(2),
        dailyAllowance: plan.dailyBudget.toFixed(2),
      });
    }

    res.json({
      success: true,
      data: {
        budget,
        aiPlan: plan,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get monthly summary
router.get('/:year/:month/summary', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const year = parseInt(req.params.year as string);
    const month = parseInt(req.params.month as string);

    const budget = await budgetRepository.findByUserAndMonth(userId, year, month);
    if (!budget) {
      res.json({ success: true, data: null });
      return;
    }

    const totalExpenses = await budgetRepository.getMonthlyExpenseTotal(userId, budget.id);
    const totalSavings = await budgetRepository.getMonthlySavingsTotal(userId, budget.id);
    const categoryBreakdown = await budgetRepository.getCategoryBreakdown(userId, budget.id);
    const dailyTrend = await budgetRepository.getDailyTrend(userId, budget.id);

    // 检查是否超预算
    const availableBudget = parseFloat(budget.availableBudget);
    const exceededBudget = totalExpenses > availableBudget;

    res.json({
      success: true,
      data: { budget, totalExpenses, totalSavings, categoryBreakdown, dailyTrend, exceededBudget },
    });
  } catch (error) {
    next(error);
  }
});

// Get daily budget details for the month
router.get('/:year/:month/daily-details', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const year = parseInt(req.params.year as string);
    const month = parseInt(req.params.month as string);

    const budget = await budgetRepository.findByUserAndMonth(userId, year, month);
    if (!budget) {
      res.json({ success: true, data: null });
      return;
    }

    const dailyTrend = await budgetRepository.getDailyTrend(userId, budget.id);
    const dailyExpensesMap = new Map<string, number>();
    dailyTrend.forEach(d => {
      dailyExpensesMap.set(d.date, parseFloat(d.totalExpense));
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const availableBudget = parseFloat(budget.availableBudget);
    const totalExpenses = await budgetRepository.getMonthlyExpenseTotal(userId, budget.id);
    const remainingBudget = availableBudget - totalExpenses;
    
    const dailyDetails = [];
    let cumulativeExpenses = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayOfWeek];
      
      const dayExpenses = dailyExpensesMap.get(dateStr) || 0;
      cumulativeExpenses += dayExpenses;
      
      // 计算剩余天数和剩余预算
      const remainingDays = daysInMonth - day + 1;
      const remainingAfterDay = remainingBudget - (cumulativeExpenses - totalExpenses);
      
      // 智能权重分配
      const baseAmount = remainingDays > 0 ? remainingAfterDay / remainingDays : 0;
      const weight = (dayOfWeek === 0 || dayOfWeek === 3 || dayOfWeek === 6) ? 1.2 : 0.8;
      const dailyAllowance = Math.round((baseAmount * weight) * 100) / 100;
      
      const remaining = Math.max(0, dailyAllowance - dayExpenses);
      
      dailyDetails.push({
        day,
        date: dateStr,
        dayOfWeek,
        dayName,
        dailyAllowance,
        dayExpenses,
        remaining,
        isToday: date.toDateString() === new Date().toDateString(),
      });
    }

    res.json({
      success: true,
      data: {
        budget,
        dailyDetails,
        totalExpenses,
        availableBudget,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
