import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { expenseRepository } from '../repositories/expenses';
import { savingsRepository } from '../repositories/savings';
import { budgetRepository } from '../repositories/budgets';
import { AppError } from '../middleware/errorHandler';
import { db } from '../db';
import { reminderSettings, reminderNotifications } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const expenses = await expenseRepository.findByUser(userId, limit);
    res.json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { amount, category, note, autoSaveRemaining } = req.body;

    const expenseAmount = parseFloat(amount);
    if (isNaN(expenseAmount) || expenseAmount <= 0) throw new AppError('Invalid amount', 400);
    if (!category) throw new AppError('Category is required', 400);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const budget = await budgetRepository.findByUserAndMonth(userId, year, month);
    if (!budget) throw new AppError('No budget set for this month. Please set up your monthly budget first.', 400);

    // 检查本月支出是否会超出预算
    const monthlyExpenses = await budgetRepository.getMonthlyExpenseTotal(userId, budget.id);
    const availableBudget = parseFloat(budget.availableBudget);
    const willExceedBudget = monthlyExpenses + expenseAmount > availableBudget;

    // 获取提醒设置
    const settingsResult = await db.select().from(reminderSettings).where(eq(reminderSettings.userId, userId));
    const settings = settingsResult[0];
    const budgetExceedReminderEnabled = settings?.budgetExceedReminder === 1;

    // 创建支出记录
    const expense = await expenseRepository.create({
      userId,
      budgetId: budget.id,
      amount: expenseAmount.toFixed(2),
      category: category as 'food' | 'shopping' | 'transport' | 'entertainment' | 'study' | 'other',
      note: note || null,
      expenseDate: Math.floor(now.getTime() / 1000),
    });

    // 如果超预算且开启了提醒，创建通知
    let exceededBudget = false;
    if (willExceedBudget && budgetExceedReminderEnabled) {
      exceededBudget = true;
      const overBudgetAmount = (monthlyExpenses + expenseAmount - availableBudget).toFixed(2);
      await db.insert(reminderNotifications).values({
        id: crypto.randomUUID(),
        userId,
        type: 'budget_exceed',
        message: `本月预算已超支 ¥${overBudgetAmount}，请注意控制支出！`,
        read: 0,
        createdAt: Math.floor(now.getTime() / 1000),
      });
    }

    let savingsRecord = null;
    if (autoSaveRemaining) {
      const todayExpenses = await budgetRepository.getDailyExpenses(userId, now);
      const dailyAllowance = parseFloat(budget.dailyAllowance);
      const remaining = dailyAllowance - todayExpenses;
      if (remaining > 0) {
        savingsRecord = await savingsRepository.create({
          userId,
          budgetId: budget.id,
          amount: remaining.toFixed(2),
          type: 'auto',
          note: '今日节省自动存入',
          recordDate: Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime() / 1000),
        });
      }
    }

    res.json({ success: true, data: { expense, savingsRecord, exceededBudget } });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const deleted = await expenseRepository.delete(id, userId);
    if (!deleted) throw new AppError('Expense not found', 404);
    res.json({ success: true, data: { message: 'Deleted successfully' } });
  } catch (error) {
    next(error);
  }
});

export default router;