import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();

const dbPath = path.join(__dirname, '..', 'saving.db');

let db;

async function initDb() {
  const SQL = await initSqlJs();
  let sqlite;
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlite = new SQL.Database(fileBuffer);
    
    // 运行额外的迁移
    const passwordResetMigrationPath = path.join(__dirname, 'migrations', 'add_password_reset.sql');
    if (fs.existsSync(passwordResetMigrationPath)) {
      const sql = fs.readFileSync(passwordResetMigrationPath, 'utf8');
      sqlite.run(sql);
      console.log('Password reset migration applied');
    }
    
    // 运行提醒迁移
    const remindersMigrationPath = path.join(__dirname, 'migrations', 'add_reminders.sql');
    if (fs.existsSync(remindersMigrationPath)) {
      const remindersSql = fs.readFileSync(remindersMigrationPath, 'utf8');
      sqlite.run(remindersSql);
      console.log('Reminders migration applied');
    }
    
    const data = sqlite.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } else {
    sqlite = new SQL.Database();
    
    const migrationPath = path.join(__dirname, 'migrations', 'init.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      sqlite.run(sql);
      console.log('Database migrated successfully');
      
      // 运行密码重置迁移
      const passwordResetMigrationPath = path.join(__dirname, 'migrations', 'add_password_reset.sql');
      if (fs.existsSync(passwordResetMigrationPath)) {
        const passwordResetSql = fs.readFileSync(passwordResetMigrationPath, 'utf8');
        sqlite.run(passwordResetSql);
        console.log('Password reset migration applied');
      }
      
      // 运行提醒迁移
      const remindersMigrationPath = path.join(__dirname, 'migrations', 'add_reminders.sql');
      if (fs.existsSync(remindersMigrationPath)) {
        const remindersSql = fs.readFileSync(remindersMigrationPath, 'utf8');
        sqlite.run(remindersSql);
        console.log('Reminders migration applied');
      }
      
      const data = sqlite.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } else {
      console.warn('Migration file not found');
    }
  }
  
  db = drizzle(sqlite);
  return db;
}

export { db, initDb };