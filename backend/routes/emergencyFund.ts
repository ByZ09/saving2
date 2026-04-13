import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { emergencyFundRepository } from '../repositories/emergencyFund';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Get emergency fund info (no password needed for basic info)
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const fund = await emergencyFundRepository.findOrCreateByUser(userId);
    const hasPassword = await emergencyFundRepository.hasPassword(userId);
    // Return fund without balance (balance requires password)
    res.json({
      success: true,
      data: {
        id: fund.id,
        targetAmount: fund.targetAmount,
        hasPassword,
        createdAt: fund.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Verify password and get balance
router.post('/verify', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { password } = req.body;
    if (!password) throw new AppError('Password is required', 400);

    const result = await emergencyFundRepository.verifyPassword(userId, password);

    if (result.locked) {
      res.status(423).json({
        success: false,
        data: null,
        message: '密码错误次数过多，账户已锁定10分钟',
        locked: true,
      });
      return;
    }

    if (!result.success) {
      res.status(401).json({
        success: false,
        data: null,
        message: `密码错误，剩余尝试次数: ${result.remainingAttempts}`,
        remainingAttempts: result.remainingAttempts,
      });
      return;
    }

    const fund = await emergencyFundRepository.findOrCreateByUser(userId);
    const transactions = await emergencyFundRepository.getTransactions(userId);

    res.json({
      success: true,
      data: { fund, transactions },
    });
  } catch (error) {
    next(error);
  }
});

// Set password
router.post('/set-password', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { password } = req.body;

    if (!password || password.length < 8) throw new AppError('密码至少需要8位字符', 400);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    if (!hasUpper || !hasLower || !hasNumber || !hasSymbol) {
      throw new AppError('密码必须包含大小写字母、数字和符号', 400);
    }

    await emergencyFundRepository.setPassword(userId, password);
    res.json({ success: true, data: { message: '备用金密码设置成功' } });
  } catch (error) {
    next(error);
  }
});

// Deposit to emergency fund (no password needed)
router.post('/deposit', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { amount } = req.body;

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) throw new AppError('Invalid amount', 400);

    const fund = await emergencyFundRepository.findOrCreateByUser(userId);
    const newBalance = (parseFloat(fund.balance) + depositAmount).toFixed(2);
    const updated = await emergencyFundRepository.updateBalance(userId, newBalance);
    await emergencyFundRepository.addTransaction({
      userId,
      amount: depositAmount.toFixed(2),
      type: 'deposit',
      reason: req.body.reason || null,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Withdraw from emergency fund (requires password verification first via /verify)
router.post('/withdraw', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { amount, password, reason } = req.body;

    if (!password) throw new AppError('Password is required', 400);
    const verifyResult = await emergencyFundRepository.verifyPassword(userId, password);
    if (verifyResult.locked) throw new AppError('账户已锁定，请10分钟后再试', 423);
    if (!verifyResult.success) throw new AppError(`密码错误，剩余尝试次数: ${verifyResult.remainingAttempts}`, 401);

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) throw new AppError('Invalid amount', 400);

    const fund = await emergencyFundRepository.findOrCreateByUser(userId);
    const currentBalance = parseFloat(fund.balance);
    if (withdrawAmount > currentBalance) throw new AppError('余额不足', 400);

    const newBalance = (currentBalance - withdrawAmount).toFixed(2);
    const updated = await emergencyFundRepository.updateBalance(userId, newBalance);
    await emergencyFundRepository.addTransaction({
      userId,
      amount: withdrawAmount.toFixed(2),
      type: 'withdraw',
      reason: reason || null,
    });

    res.json({ success: true, data: { fund: updated, withdrawAmount } });
  } catch (error) {
    next(error);
  }
});

// Update target amount
router.put('/target', authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { targetAmount } = req.body;
    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) throw new AppError('Invalid target amount', 400);
    const updated = await emergencyFundRepository.updateTarget(userId, target.toFixed(2));
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
