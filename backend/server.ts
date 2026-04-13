import 'dotenv/config';
import express, { ErrorRequestHandler } from 'express';
import path from 'path';
import passport from 'passport';

import authRoutes from './routes/auth';
import budgetRoutes from './routes/budgets';
import expenseRoutes from './routes/expenses';
import savingsRoutes from './routes/savings';
import emergencyFundRoutes from './routes/emergencyFund';

import { SERVER_CONFIG } from './config/constants';
import { errorHandler } from './middleware/errorHandler';
import './config/passport';

const app = express();

/**
 * Body Parsers
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.listen(SERVER_CONFIG.PORT, () => {
  console.log(`Server ready on port ${SERVER_CONFIG.PORT}`);
});

export default app;
