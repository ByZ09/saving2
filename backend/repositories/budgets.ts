import { db } from '../db';
import { monthlyBudgets, expenses, savingsRecords, insertMonthlyBudgetSchema } from '../db/schema';
import type { InsertMonthlyBudget } from '../db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { generateId, getStartOfDay, getEndOfDay, getTimestamp } from '../utils';
import { aiService } from '../services/aiService';

type CreateBudgetInput = z.infer<typeof insertMonthlyBudgetSchema>;

export class BudgetRepository {
  async findByUserAndMonth(userId: string, year: number, month: number) {
    const [budget] = await db
      .select()
      .from(monthlyBudgets)
      .where(
        and(
          eq(monthlyBudgets.userId, userId),
          eq(monthlyBudgets.year, year),
          eq(monthlyBudgets.month, month)
        )
      );
    return budget;
  }

  async findAllByUser(userId: string) {
    return await db
      .select()
      .from(monthlyBudgets)
      .where(eq(monthlyBudgets.userId, userId))
      .orderBy(desc(monthlyBudgets.year), desc(monthlyBudgets.month));
  }

  async create(data: CreateBudgetInput) {
    const [budget] = await db
      .insert(monthlyBudgets)
      .values({
        ...data as InsertMonthlyBudget,
        id: generateId(),
      })
      .returning();
    return budget;
  }

  async update(id: string, data: Partial<CreateBudgetInput>) {
    const [budget] = await db
      .update(monthlyBudgets)
      .set({ ...data as Partial<InsertMonthlyBudget>, updatedAt: getTimestamp() })
      .where(eq(monthlyBudgets.id, id))
      .returning();
    return budget;
  }

  async getMonthlyExpenseTotal(userId: string, budgetId: string) {
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.budgetId, budgetId)));
    return parseFloat(result[0]?.total || '0');
  }

  async getMonthlySavingsTotal(userId: string, budgetId: string) {
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${savingsRecords.amount}), 0)` })
      .from(savingsRecords)
      .where(and(eq(savingsRecords.userId, userId), eq(savingsRecords.budgetId, budgetId)));
    return parseFloat(result[0]?.total || '0');
  }

  async getDailyExpenses(userId: string, date: Date) {
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.expenseDate, getStartOfDay(date)),
          lte(expenses.expenseDate, getEndOfDay(date))
        )
      );
    return parseFloat(result[0]?.total || '0');
  }

  async getCategoryBreakdown(userId: string, budgetId: string) {
    return await db
      .select({
        category: expenses.category,
        total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.budgetId, budgetId)))
      .groupBy(expenses.category);
  }

  async getDailyTrend(userId: string, budgetId: string) {
    return await db
      .select({
        date: sql<string>`DATE(${expenses.expenseDate})`,
        totalExpense: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.budgetId, budgetId)))
      .groupBy(sql`DATE(${expenses.expenseDate})`)
      .orderBy(sql`DATE(${expenses.expenseDate})`);
  }

  /**
   * 计算AI智能每日可支配金额
   * 根据星期几动态分配：周一、周二、周四、周五少一点，周三、周六、周日多一点
   */
  async calculateDailyBudget(userId: string, date: Date): Promise<number> {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    const budget = await this.findByUserAndMonth(userId, year, month);
    if (!budget) return 0;
    
    const monthlyBudget = parseFloat(budget.availableBudget);
    const monthlyExpenses = await this.getMonthlyExpenseTotal(userId, budget.id);
    const monthlySavings = await this.getMonthlySavingsTotal(userId, budget.id);
    
    const remainingBudget = monthlyBudget - monthlyExpenses;
    const daysInMonth = new Date(year, month, 0).getDate();
    const remainingDays = daysInMonth - date.getDate() + 1;
    
    if (remainingDays <= 0) return 0;
    
    // 获取过去7天的消费模式
    const pastSpending = await this.getWeeklySpendingPattern(userId, budget.id);
    
    try {
      // 使用AI获取每日预算建议
      const result = await aiService.getDailyBudgetSuggestion(
        monthlyBudget,
        remainingBudget,
        remainingDays,
        date,
        pastSpending
      );
      
      return result.amount;
    } catch (error) {
      console.warn('⚠️ AI服务不可用，使用智能权重分配:', error);
      // AI服务不可用时，使用智能权重分配
      const dayOfWeek = date.getDay();
      const baseAmount = remainingBudget / remainingDays;
      // 周一、周二、周四、周五权重0.8，周三、周六、周日权重1.2
      const weight = (dayOfWeek === 0 || dayOfWeek === 3 || dayOfWeek === 6) ? 1.2 : 0.8;
      return Math.round((baseAmount * weight) * 100) / 100;
    }
  }

  /**
   * 获取每周消费模式（用于AI）
   */
  async getWeeklySpendingPattern(userId: string, budgetId?: string): Promise<{ dayOfWeek: number; avgAmount: number }[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoTimestamp = Math.floor(sevenDaysAgo.getTime() / 1000);
    
    const whereConditions = budgetId
      ? and(
          eq(expenses.userId, userId),
          eq(expenses.budgetId, budgetId),
          gte(expenses.expenseDate, sevenDaysAgoTimestamp)
        )
      : and(
          eq(expenses.userId, userId),
          gte(expenses.expenseDate, sevenDaysAgoTimestamp)
        );
    
    const rows = await db
      .select({
        dayOfWeek: sql<number>`CAST(STRFTIME('%w', DATETIME(${expenses.expenseDate}, 'unixepoch')) AS INTEGER)`,
        avgAmount: sql<number>`AVG(${expenses.amount})`,
      })
      .from(expenses)
      .where(whereConditions)
      .groupBy(sql`STRFTIME('%w', DATETIME(${expenses.expenseDate}, 'unixepoch'))`);
    
    return rows.map(row => ({
      dayOfWeek: row.dayOfWeek,
      avgAmount: Math.round(row.avgAmount * 100) / 100,
    }));
  }
}

export const budgetRepository = new BudgetRepository();
