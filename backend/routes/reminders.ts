import { Router, Request, Response, NextFunction } from 'express';
import { reminderSettings, reminderNotifications, insertReminderSettingsSchema, updateReminderSettingsSchema } from '../db/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { generateId, getTimestamp } from '../utils';
const router = Router();
// 获取提醒设置
router.get('/settings', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
 try {
 const user = (req as AuthRequest).user!;
 const result = await db.select().from(reminderSettings).where(eq(reminderSettings.userId, user.id));
 const [settings] = result;
 if (!settings) {
 const defaultSettings = await db.insert(reminderSettings).values({
 id: generateId(),
 userId: user.id,
 dailyLimitReminder: 1,
 dailyLimitAmount: 0,
 budgetExceedReminder: 1,
 savingsGoalReminder: 1,
 }).returning();
 return res.json({
 success: true,
 data: defaultSettings[0],
 });
 }
 res.json({
 success: true,
 data: settings,
 });
 }
 catch (error) {
 next(error);
 }
});
// 更新提醒设置
router.put('/settings', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
 try {
 const user = (req as AuthRequest).user!;
 const validatedData = updateReminderSettingsSchema.parse(req.body);
 const result = await db.update(reminderSettings)
 .set({
 ...validatedData,
 updatedAt: getTimestamp(),
 })
 .where(eq(reminderSettings.userId, user.id))
 .returning();
 if (result.length === 0) {
 const newSettings = await db.insert(reminderSettings).values({
 id: generateId(),
 userId: user.id,
 dailyLimitReminder: validatedData.dailyLimitReminder ?? 1,
 dailyLimitAmount: validatedData.dailyLimitAmount ?? 0,
 budgetExceedReminder: validatedData.budgetExceedReminder ?? 1,
 savingsGoalReminder: validatedData.savingsGoalReminder ?? 1,
 }).returning();
 return res.json({
 success: true,
 data: newSettings[0],
 });
 }
 res.json({
 success: true,
 data: result[0],
 });
 }
 catch (error) {
 next(error);
 }
});
// 获取提醒通知列表
router.get('/notifications', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
 try {
 const user = (req as AuthRequest).user!;
 const result = await db.select()
 .from(reminderNotifications)
 .where(eq(reminderNotifications.userId, user.id))
 .orderBy(reminderNotifications.createdAt, 'desc');
 res.json({
 success: true,
 data: result,
 });
 }
 catch (error) {
 next(error);
 }
});
// 标记通知为已读
router.put('/notifications/:id/read', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
 try {
 const user = (req as AuthRequest).user!;
 const { id } = req.params;
 const result = await db.update(reminderNotifications)
 .set({ read: 1 })
 .where(eq(reminderNotifications.id, id))
 .where(eq(reminderNotifications.userId, user.id))
 .returning();
 if (result.length === 0) {
 return res.status(404).json({
 success: false,
 message: '通知不存在',
 });
 }
 res.json({
 success: true,
 data: result[0],
 });
 }
 catch (error) {
 next(error);
 }
});
// 标记所有通知为已读
router.put('/notifications/read-all', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
 try {
 const user = (req as AuthRequest).user!;
 await db.update(reminderNotifications)
 .set({ read: 1 })
 .where(eq(reminderNotifications.userId, user.id));
 res.json({
 success: true,
 message: '所有通知已标记为已读',
 });
 }
 catch (error) {
 next(error);
 }
});
// 删除通知
router.delete('/notifications/:id', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
 try {
 const user = (req as AuthRequest).user!;
 const { id } = req.params;
 const result = await db.delete(reminderNotifications)
 .where(eq(reminderNotifications.id, id))
 .where(eq(reminderNotifications.userId, user.id))
 .returning();
 if (result.length === 0) {
 return res.status(404).json({
 success: false,
 message: '通知不存在',
 });
 }
 res.json({
 success: true,
 message: '通知已删除',
 });
 }
 catch (error) {
 next(error);
 }
});
export default router;