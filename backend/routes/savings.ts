import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { savingsRepository } from '../repositories/savings';
import { budgetRepository } from '../repositories/budgets';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Get savings records
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const records = await savingsRepository.findByUser(userId);
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
});

// Manually add savings
router.post('/', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { amount, note } = req.body;

    const savingsAmount = parseFloat(amount);
    if (isNaN(savingsAmount) || savingsAmount <= 0) throw new AppError('Invalid amount', 400);

    const now = new Date();
    const budget = await budgetRepository.findByUserAndMonth(userId, now.getFullYear(), now.getMonth() + 1);

    const record = await savingsRepository.create({
      userId,
      budgetId: budget?.id || null,
      amount: savingsAmount.toFixed(2),
      type: 'manual',
      note: note || null,
      recordDate: now,
    });

    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

export default router;
