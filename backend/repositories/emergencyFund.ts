import { db } from '../db';
import { emergencyFund, emergencyFundTransactions, users } from '../db/schema';
import type { InsertEmergencyFund, InsertEmergencyFundTransaction } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export class EmergencyFundRepository {
  async findOrCreateByUser(userId: string) {
    let [fund] = await db
      .select()
      .from(emergencyFund)
      .where(eq(emergencyFund.userId, userId));

    if (!fund) {
      [fund] = await db
        .insert(emergencyFund)
        .values({ userId, balance: '0', targetAmount: '1000' } as InsertEmergencyFund)
        .returning();
    }
    return fund;
  }

  async updateBalance(userId: string, newBalance: string) {
    const [fund] = await db
      .update(emergencyFund)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(emergencyFund.userId, userId))
      .returning();
    return fund;
  }

  async updateTarget(userId: string, targetAmount: string) {
    const [fund] = await db
      .update(emergencyFund)
      .set({ targetAmount, updatedAt: new Date() })
      .where(eq(emergencyFund.userId, userId))
      .returning();
    return fund;
  }

  async addTransaction(data: InsertEmergencyFundTransaction) {
    const [tx] = await db
      .insert(emergencyFundTransactions)
      .values(data)
      .returning();
    return tx;
  }

  async getTransactions(userId: string, limit = 20) {
    return await db
      .select()
      .from(emergencyFundTransactions)
      .where(eq(emergencyFundTransactions.userId, userId))
      .orderBy(desc(emergencyFundTransactions.createdAt))
      .limit(limit);
  }

  async setPassword(userId: string, password: string) {
    const hashed = await bcrypt.hash(password, 12);
    await db
      .update(users)
      .set({ emergencyFundPassword: hashed, emergencyFundFailedAttempts: 0, emergencyFundLockUntil: null })
      .where(eq(users.id, userId));
  }

  async verifyPassword(userId: string, password: string): Promise<{ success: boolean; locked: boolean; remainingAttempts: number }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return { success: false, locked: false, remainingAttempts: 0 };

    // Check lock
    if (user.emergencyFundLockUntil && new Date() < user.emergencyFundLockUntil) {
      return { success: false, locked: true, remainingAttempts: 0 };
    }

    if (!user.emergencyFundPassword) {
      return { success: false, locked: false, remainingAttempts: 5 };
    }

    const isValid = await bcrypt.compare(password, user.emergencyFundPassword);

    if (isValid) {
      // Reset failed attempts
      await db.update(users).set({ emergencyFundFailedAttempts: 0, emergencyFundLockUntil: null }).where(eq(users.id, userId));
      return { success: true, locked: false, remainingAttempts: 5 };
    } else {
      const newAttempts = (user.emergencyFundFailedAttempts || 0) + 1;
      const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 10 * 60 * 1000) : null;
      await db.update(users).set({ emergencyFundFailedAttempts: newAttempts, emergencyFundLockUntil: lockUntil }).where(eq(users.id, userId));
      return { success: false, locked: newAttempts >= 5, remainingAttempts: Math.max(0, 5 - newAttempts) };
    }
  }

  async hasPassword(userId: string): Promise<boolean> {
    const [user] = await db.select({ pwd: users.emergencyFundPassword }).from(users).where(eq(users.id, userId));
    return !!user?.pwd;
  }
}

export const emergencyFundRepository = new EmergencyFundRepository();
