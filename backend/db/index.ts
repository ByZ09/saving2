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
  } else {
    sqlite = new SQL.Database();
    
    const migrationPath = path.join(__dirname, 'migrations', 'init.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      sqlite.run(sql);
      console.log('Database migrated successfully');
      
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