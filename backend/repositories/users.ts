import { db } from '../db';
import { users, insertUserSchema } from '../db/schema';
import type { InsertUser } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generateId } from '../utils';

type CreateUserInput = z.infer<typeof insertUserSchema>;

export class UserRepository {
  async create(userData: CreateUserInput) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        id: generateId(),
        password: hashedPassword,
      } as InsertUser)
      .returning();

    return user;
  }

  async findByPhone(phone: string) {
    const result = await db.select().from(users).where(eq(users.phone, phone));
    const [user] = result;
    return user;
  }

  async findAll() {
    return await db.select().from(users);
  }

  async verifyPassword(plainPassword: string, hashedPassword: string) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async updatePassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async findById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id));
    const [user] = result;
    return user;
  }
}
export const userRepository = new UserRepository();