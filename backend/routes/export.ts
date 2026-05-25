import { Router, Request, Response, NextFunction } from 'express';
import { users, expenses, savingsRecords, monthlyBudgets, emergencyFund, emergencyFundTransactions } from '../db/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();

const generateCSV = (headers: string[], rows: any[]): string => {
  const csvHeaders = headers.join(',');
  const csvRows = rows.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',');
  });
  return [csvHeaders, ...csvRows].join('\n');
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDateStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

router.get('/expenses', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user!;
    const userExpenses = await db.select().from(expenses).where(eq(expenses.userId, user.id));
    
    const headers = ['日期', '分类', '金额(元)', '备注'];
    const rows = userExpenses.map(exp => ({
      '日期': formatDate(exp.expenseDate),
      '分类': { food: '餐饮', shopping: '购物', transport: '交通', entertainment: '娱乐', study: '学习', other: '其他' }[exp.category] || exp.category,
      '金额(元)': exp.amount,
      '备注': exp.note || ''
    }));
    
    const csv = generateCSV(headers, rows);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=expenses_${getDateStr()}.csv`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    next(error);
  }
});

router.get('/savings', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user!;
    const userSavings = await db.select().from(savingsRecords).where(eq(savingsRecords.userId, user.id));
    
    const headers = ['日期', '类型', '金额(元)', '备注'];
    const rows = userSavings.map(sav => ({
      '日期': formatDate(sav.recordDate),
      '类型': sav.type === 'auto' ? '自动存入' : '手动存入',
      '金额(元)': sav.amount,
      '备注': sav.note || ''
    }));
    
    const csv = generateCSV(headers, rows);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=savings_${getDateStr()}.csv`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    next(error);
  }
});

router.get('/budgets', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user!;
    const userBudgets = await db.select().from(monthlyBudgets).where(eq(monthlyBudgets.userId, user.id));
    
    const headers = ['年份', '月份', '总收入(元)', '存钱目标(元)', '可用预算(元)', '每日额度(元)', '创建时间'];
    const rows = userBudgets.map(budget => ({
      '年份': budget.year,
      '月份': budget.month,
      '总收入(元)': budget.totalIncome,
      '存钱目标(元)': budget.savingsGoal,
      '可用预算(元)': budget.availableBudget,
      '每日额度(元)': budget.dailyAllowance,
      '创建时间': formatDate(budget.createdAt)
    }));
    
    const csv = generateCSV(headers, rows);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=budgets_${getDateStr()}.csv`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    next(error);
  }
});

router.get('/backup', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user!;
    
    const [userInfo, userExpenses, userSavings, userBudgets, userEmergencyFund, userEfTransactions] = await Promise.all([
      db.select().from(users).where(eq(users.id, user.id)),
      db.select().from(expenses).where(eq(expenses.userId, user.id)),
      db.select().from(savingsRecords).where(eq(savingsRecords.userId, user.id)),
      db.select().from(monthlyBudgets).where(eq(monthlyBudgets.userId, user.id)),
      db.select().from(emergencyFund).where(eq(emergencyFund.userId, user.id)),
      db.select().from(emergencyFundTransactions).where(eq(emergencyFundTransactions.userId, user.id))
    ]);
    
    const backupData = {
      version: '1.0',
      exportTime: Date.now(),
      user: userInfo[0] ? {
        id: userInfo[0].id,
        name: userInfo[0].name,
        phone: userInfo[0].phone,
        createdAt: userInfo[0].createdAt
      } : null,
      expenses: userExpenses.map(e => ({
        id: e.id, amount: e.amount, category: e.category, note: e.note, expenseDate: e.expenseDate, createdAt: e.createdAt
      })),
      savings: userSavings.map(s => ({
        id: s.id, amount: s.amount, type: s.type, note: s.note, recordDate: s.recordDate, createdAt: s.createdAt
      })),
      budgets: userBudgets.map(b => ({
        id: b.id, year: b.year, month: b.month, totalIncome: b.totalIncome, savingsGoal: b.savingsGoal,
        availableBudget: b.availableBudget, dailyAllowance: b.dailyAllowance, createdAt: b.createdAt, updatedAt: b.updatedAt
      })),
      emergencyFund: userEmergencyFund[0] ? {
        id: userEmergencyFund[0].id, balance: userEmergencyFund[0].balance, targetAmount: userEmergencyFund[0].targetAmount,
        createdAt: userEmergencyFund[0].createdAt, updatedAt: userEmergencyFund[0].updatedAt
      } : null,
      emergencyFundTransactions: userEfTransactions.map(t => ({
        id: t.id, amount: t.amount, type: t.type, reason: t.reason, createdAt: t.createdAt
      }))
    };
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=backup_${getDateStr()}.json`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    next(error);
  }
});

router.post('/restore', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user!;
    const backupData = req.body;
    
    if (!backupData || !backupData.version) {
      return res.status(400).json({ success: false, message: '无效的备份数据' });
    }
    
    await db.delete(expenses).where(eq(expenses.userId, user.id));
    await db.delete(savingsRecords).where(eq(savingsRecords.userId, user.id));
    await db.delete(monthlyBudgets).where(eq(monthlyBudgets.userId, user.id));
    await db.delete(emergencyFund).where(eq(emergencyFund.userId, user.id));
    await db.delete(emergencyFundTransactions).where(eq(emergencyFundTransactions.userId, user.id));
    
    if (backupData.budgets && Array.isArray(backupData.budgets)) {
      for (const budget of backupData.budgets) {
        await db.insert(monthlyBudgets).values({ ...budget, userId: user.id });
      }
    }
    
    if (backupData.expenses && Array.isArray(backupData.expenses)) {
      for (const expense of backupData.expenses) {
        await db.insert(expenses).values({ ...expense, userId: user.id });
      }
    }
    
    if (backupData.savings && Array.isArray(backupData.savings)) {
      for (const saving of backupData.savings) {
        await db.insert(savingsRecords).values({ ...saving, userId: user.id });
      }
    }
    
    if (backupData.emergencyFund) {
      await db.insert(emergencyFund).values({ ...backupData.emergencyFund, userId: user.id });
    }
    
    if (backupData.emergencyFundTransactions && Array.isArray(backupData.emergencyFundTransactions)) {
      for (const transaction of backupData.emergencyFundTransactions) {
        await db.insert(emergencyFundTransactions).values({ ...transaction, userId: user.id });
      }
    }
    
    res.json({ success: true, message: '数据恢复成功' });
  } catch (error) {
    next(error);
  }
});

router.get('/all', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user!;
    
    const [userExpenses, userSavings, userBudgets] = await Promise.all([
      db.select().from(expenses).where(eq(expenses.userId, user.id)),
      db.select().from(savingsRecords).where(eq(savingsRecords.userId, user.id)),
      db.select().from(monthlyBudgets).where(eq(monthlyBudgets.userId, user.id))
    ]);
    
    let csvContent = '\uFEFF';
    
    csvContent += '=== 支出记录 ===\n';
    csvContent += generateCSV(['日期', '分类', '金额(元)', '备注'], 
      userExpenses.map(exp => ({
        '日期': formatDate(exp.expenseDate),
        '分类': { food: '餐饮', shopping: '购物', transport: '交通', entertainment: '娱乐', study: '学习', other: '其他' }[exp.category] || exp.category,
        '金额(元)': exp.amount,
        '备注': exp.note || ''
      }))
    );
    
    csvContent += '\n\n';
    
    csvContent += '=== 储蓄记录 ===\n';
    csvContent += generateCSV(['日期', '类型', '金额(元)', '备注'],
      userSavings.map(sav => ({
        '日期': formatDate(sav.recordDate),
        '类型': sav.type === 'auto' ? '自动存入' : '手动存入',
        '金额(元)': sav.amount,
        '备注': sav.note || ''
      }))
    );
    
    csvContent += '\n\n';
    
    csvContent += '=== 月度预算 ===\n';
    csvContent += generateCSV(['年份', '月份', '总收入(元)', '存钱目标(元)', '可用预算(元)', '每日额度(元)'],
      userBudgets.map(budget => ({
        '年份': budget.year,
        '月份': budget.month,
        '总收入(元)': budget.totalIncome,
        '存钱目标(元)': budget.savingsGoal,
        '可用预算(元)': budget.availableBudget,
        '每日额度(元)': budget.dailyAllowance
      }))
    );
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=all_data_${getDateStr()}.csv`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

export default router;