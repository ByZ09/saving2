import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { budgetRepository } from '../repositories/budgets';
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

    const daysInMonth = new Date(year, month, 0).getDate();
    const dayOfMonth = now.getDate();
    const dailyAllowance = parseFloat(budget.dailyAllowance);
    const todayRemaining = Math.max(0, dailyAllowance - todayExpenses);

    res.json({
      success: true,
      data: {
        budget,
        totalExpenses,
        totalSavings,
        todayExpenses,
        todayRemaining,
        categoryBreakdown,
        dailyTrend,
        daysInMonth,
        dayOfMonth,
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

    res.json({
      success: true,
      data: { budget, totalExpenses, totalSavings, categoryBreakdown, dailyTrend },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
