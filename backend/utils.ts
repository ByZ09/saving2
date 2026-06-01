import crypto from 'crypto';

export const generateId = (): string => crypto.randomUUID();

export const getTimestamp = (): number => Math.floor(Date.now() / 1000);

export const asyncHandler = <P = Record<string, unknown>, ResBody = unknown, ReqBody = unknown>(
  fn: (req: P, res: ResBody, next?: () => void) => Promise<unknown>
) => {
  return (req: P, res: ResBody, next: (error?: unknown) => void) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toISOString().split('T')[0];
};

export const getStartOfDay = (date: Date): number => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return Math.floor(start.getTime() / 1000);
};

export const getEndOfDay = (date: Date): number => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return Math.floor(end.getTime() / 1000);
};