import { db } from '../db';
import { savingsRecords, insertSavingsRecordSchema } from '../db/schema';
import type { InsertSavingsRecord } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

type CreateSavingsInput = z.infer<typeof insertSavingsRecordSchema>;

export class SavingsRepository {
  async create(data: CreateSavingsInput) {
    const [record] = await db
      .insert(savingsRecords)
      .values({
        ...data as InsertSavingsRecord,
        id: crypto.randomUUID(),
      })
      .returning();
    return record;
  }

  async findByUser(userId: string, limit = 50) {
    return await db
      .select()
      .from(savingsRecords)
      .where(eq(savingsRecords.userId, userId))
      .orderBy(desc(savingsRecords.recordDate))
      .limit(limit);
  }

  async findByUserAndBudget(userId: string, budgetId: string) {
    return await db
      .select()
      .from(savingsRecords)
      .where(and(eq(savingsRecords.userId, userId), eq(savingsRecords.budgetId, budgetId)))
      .orderBy(desc(savingsRecords.recordDate));
  }
}

export const savingsRepository = new SavingsRepository();
