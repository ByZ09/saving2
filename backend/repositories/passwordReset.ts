import { db } from '../db';
import { passwordResetTokens, users } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { generateId, getTimestamp } from '../utils';

export class PasswordResetRepository {
  /**
   * 创建密码重置令牌
   */
  async createToken(userId: string): Promise<{ token: string; code: string }> {
    const token = generateId();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = getTimestamp() + 3600;

    await db.insert(passwordResetTokens).values({
      id: generateId(),
      userId,
      token,
      code,
      expiresAt,
      used: 0,
    });

    return { token, code };
  }

  /**
   * 根据令牌查找有效的重置记录
   */
  async findValidToken(token: string) {
    const result = await db
      .select({
        token: passwordResetTokens,
        user: users,
      })
      .from(passwordResetTokens)
      .innerJoin(users, eq(passwordResetTokens.userId, users.id))
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, 0),
          gt(passwordResetTokens.expiresAt, getTimestamp())
        )
      );

    return result[0] || null;
  }

  /**
   * 验证验证码
   */
  async verifyCode(token: string, code: string) {
    const result = await db
      .select({
        token: passwordResetTokens,
        user: users,
      })
      .from(passwordResetTokens)
      .innerJoin(users, eq(passwordResetTokens.userId, users.id))
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.code, code),
          eq(passwordResetTokens.used, 0),
          gt(passwordResetTokens.expiresAt, getTimestamp())
        )
      );

    return result[0] || null;
  }

  /**
   * 标记令牌为已使用
   */
  async markTokenAsUsed(token: string) {
    await db
      .update(passwordResetTokens)
      .set({ used: 1 })
      .where(eq(passwordResetTokens.token, token));
  }

  /**
   * 重置用户密码
   */
  async resetPassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  /**
   * 删除用户的所有旧令牌
   */
  async deleteUserTokens(userId: string) {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
  }
}

export const passwordResetRepository = new PasswordResetRepository();
