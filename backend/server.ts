import 'dotenv/config';
import express, { ErrorRequestHandler } from 'express';
import path from 'path';
import passport from 'passport';
import cors from 'cors';

import authRoutes from './routes/auth';
import budgetRoutes from './routes/budgets';
import expenseRoutes from './routes/expenses';
import savingsRoutes from './routes/savings';
import emergencyFundRoutes from './routes/emergencyFund';
import reminderRoutes from './routes/reminders';
import exportRoutes from './routes/export';

import { SERVER_CONFIG } from './config/constants';
import { errorHandler } from './middleware/errorHandler';
import { initDb } from './db';
import './config/passport';

const app = express();

async function startServer() {
  try {
    await initDb();
    console.log('Database initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }

  /**
   * Body Parsers
   */
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  /**
   * CORS Configuration
   */
  app.use(cors({
    origin: ['http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  /**
   * Passport
   */
  app.use(passport.initialize());

  /**
   * Static Files
   */
  const REACT_BUILD_FOLDER = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(
    express.static(REACT_BUILD_FOLDER, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      },
    })
  );

  app.use(
    '/assets',
    express.static(path.join(REACT_BUILD_FOLDER, 'assets'), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      },
    })
  );

  /**
   * API Routes
   */
  app.use('/api/auth', authRoutes);
  app.use('/api/budgets', budgetRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/savings', savingsRoutes);
  app.use('/api/emergency-fund', emergencyFundRoutes);
  app.use('/api/reminders', reminderRoutes);
  app.use('/api/export', exportRoutes);

  /**
   * SPA Fallback Route
   */
  app.get('*', (_req, res) => {
    res.sendFile(path.join(REACT_BUILD_FOLDER, 'index.html'));
  });

  /**
   * Error Handler
   */
  app.use(errorHandler as ErrorRequestHandler);

  /**
   * Start Server
   */
  app.listen(SERVER_CONFIG.PORT, '0.0.0.0', () => {
    console.log(`Server ready on port ${SERVER_CONFIG.PORT}`);
  });
}

startServer();

export default app;
