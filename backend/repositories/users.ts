import { db } from '../db';
import { users, insertUserSchema } from '../db/schema';
import type { InsertUser } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';

type CreateUserInput = z.infer<typeof insertUserSchema>;

export class UserRepository {
  async create(userData: CreateUserInput) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        id: crypto.randomUUID(),
        password: hashedPassword,
      } as InsertUser)
      .returning();

    return user;
  }

  async findByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email));
    const [user] = result;
    return user;
  }

  async findAll() {
    return await db.select().from(users);
  }

  async verifyPassword(plainPassword: string, hashedPassword: string) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
export const userRepository = new UserRepository();