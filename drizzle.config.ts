import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './backend/db/schema.ts',
  out: './backend/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './saving.db',
  },
  migrations: {
    prefix: 'timestamp',
  },
  verbose: true,
  strict: true,
});
