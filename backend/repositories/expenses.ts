import { db } from '../db';
import { expenses, insertExpenseSchema } from '../db/schema';
import type { InsertExpense } from '../db/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { generateId, getStartOfDay, getEndOfDay } from '../utils';

type CreateExpenseInput = z.infer<typeof insertExpenseSchema>;

export class ExpenseRepository {
  async create(data: CreateExpenseInput) {
    const [expense] = await db
      .insert(expenses)
      .values({
        ...data as InsertExpense,
        id: generateId(),
      })
      .returning();
    return expense;
  }

  async findByUser(userId: string, limit = 50) {
    return await db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.expenseDate))
      .limit(limit);
  }

  async findByUserAndBudget(userId: string, budgetId: string) {
    return await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.budgetId, budgetId)))
      .orderBy(desc(expenses.expenseDate));
  }

  async findByUserAndDateRange(userId: string, startDate: Date, endDate: Date) {
    return await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.expenseDate, getStartOfDay(startDate)),
          lte(expenses.expenseDate, getEndOfDay(endDate))
        )
      )
      .orderBy(desc(expenses.expenseDate));
  }

  async delete(id: string, userId: string) {
    const result = await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();
    return result.length > 0;
  }
}

export const expenseRepository = new ExpenseRepository();
