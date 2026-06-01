import { db } from '../db';
import { monthlyBudgets, expenses, savingsRecords, insertMonthlyBudgetSchema } from '../db/schema';
import type { InsertMonthlyBudget } from '../db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { generateId, getStartOfDay, getEndOfDay } from '../utils';

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
}

export const budgetRepository = new BudgetRepository();
