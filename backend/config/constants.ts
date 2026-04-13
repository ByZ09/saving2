export const SERVER_CONFIG = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET,
  FALLBACK_SECRET: 'campus-savings-secret-key-2026',
  EXPIRES_IN: '7d',
} as const;

export const AUTH_ERRORS = {
  UNAUTHORIZED: 'Unauthorized - Please login',
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
  USER_NOT_FOUND: 'User not found',
} as const;
