import { Router, Request, Response, NextFunction } from 'express';
import { UserRepository } from '../repositories/users';
import { PasswordResetRepository } from '../repositories/passwordReset';
import { signupUserSchema, forgotPasswordSchema, verifyResetCodeSchema, resetPasswordSchema, changePasswordSchema } from '../db/schema';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG, AUTH_ERRORS } from '../config/constants';
import { AppError } from '../middleware/errorHandler';
import { authenticateLocal, authenticateJWT, AuthRequest } from '../middleware/auth';
import { sendEmail } from '../services/emailService';

const router = Router();
const userRepo = new UserRepository();
const passwordResetRepo = new PasswordResetRepository();

const signupHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = signupUserSchema.parse(req.body);

    const existingUser = await userRepo.findByPhone(validatedData.phone);
    if (existingUser) {
      throw new AppError(AUTH_ERRORS.EMAIL_ALREADY_EXISTS, 400);
    }

    const user = await userRepo.create({
      phone: validatedData.phone,
      password: validatedData.password,
      name: validatedData.name,
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        message: 'Signup successful',
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

const loginHandler = (req: Request, res: Response) => {
  const user = (req as AuthRequest).user!;
  const token = generateToken(user);

  res.json({
    success: true,
    data: {
      message: 'Login successful',
      token,
      user: sanitizeUser(user),
    },
  });
};

const getCurrentUser = (req: Request, res: Response) => {
  const user = (req as AuthRequest).user!;
  res.json({
    success: true,
    data: {
      user: sanitizeUser(user),
    },
  });
};

/**
 * 忘记密码 - 发送重置验证码
 */
const forgotPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    // 查找用户
    const user = await userRepo.findByPhone(email);
    if (!user) {
      // 为了安全，即使用户不存在也返回成功，但不发送邮件
      return res.json({
        success: true,
        data: {
          message: '如果该手机号已注册，我们将发送密码重置验证码',
        },
      });
    }

    // 删除该用户的旧令牌
    await passwordResetRepo.deleteUserTokens(user.id);

    // 创建新的重置令牌
    const { token, code } = await passwordResetRepo.createToken(user.id);

    // 发送邮件
    const emailResult = await sendEmail({
      to: email,
      subject: '密码重置验证码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">密码重置</h2>
          <p>您好 ${user.name}，</p>
          <p>您请求重置密码。请使用以下验证码完成密码重置：</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 8px;">${code}</span>
          </div>
          <p>此验证码将在1小时后过期。</p>
          <p>如果您没有请求重置密码，请忽略此邮件。</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `,
      text: `您好 ${user.name}，您请求重置密码。验证码：${code}，此验证码将在1小时后过期。`,
    });

    // 如果邮件发送失败，在开发环境中打印验证码到控制台
    if (!emailResult.success) {
      console.warn('发送邮件失败:', emailResult.error);
      console.log('=================== 验证码 (开发环境) ===================');
      console.log(`手机号: ${email}`);
      console.log(`验证码: ${code}`);
      console.log('========================================================');
    }

    res.json({
      success: true,
      data: {
        message: '验证码已发送至您的手机',
        token, // 返回token用于下一步验证
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 验证重置验证码
 */
const verifyResetCodeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, code } = verifyResetCodeSchema.parse(req.body);

    const resetRecord = await passwordResetRepo.verifyCode(token, code);

    if (!resetRecord) {
      throw new AppError('验证码无效或已过期', 400);
    }

    res.json({
      success: true,
      data: {
        message: '验证码验证成功',
        valid: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 重置密码
 */
const resetPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, code, password } = resetPasswordSchema.parse(req.body);

    // 验证令牌和验证码
    const resetRecord = await passwordResetRepo.verifyCode(token, code);

    if (!resetRecord) {
      throw new AppError('验证码无效或已过期', 400);
    }

    // 更新密码
    await userRepo.updatePassword(resetRecord.user.id, password);

    // 标记令牌为已使用
    await passwordResetRepo.markTokenAsUsed(token);

    res.json({
      success: true,
      data: {
        message: '密码重置成功，请使用新密码登录',
      },
    });
  } catch (error) {
    next(error);
  }
};

const generateToken = (user: any) => {
  const jwtSecret = JWT_CONFIG.SECRET || JWT_CONFIG.FALLBACK_SECRET;
  return jwt.sign({ userId: user.id, phone: user.phone }, jwtSecret, {
    expiresIn: JWT_CONFIG.EXPIRES_IN,
  });
};

const sanitizeUser = (user: any) => ({
  id: user.id,
  phone: user.phone,
  name: user.name,
});

/**
 * 修改密码
 */
const changePasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);
    const authUser = (req as AuthRequest).user!;

    // 从数据库获取用户记录（包含密码）
    const user = await userRepo.findById(authUser.id);
    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    const isValid = await userRepo.verifyPassword(oldPassword, user.password);
    if (!isValid) {
      throw new AppError('原密码错误', 400);
    }

    await userRepo.updatePassword(authUser.id, newPassword);

    res.json({
      success: true,
      data: {
        message: '密码修改成功',
      },
    });
  } catch (error) {
    next(error);
  }
};

router.post('/signup', signupHandler);
router.post('/login', authenticateLocal, loginHandler);
router.get('/me', authenticateJWT, getCurrentUser);
router.post('/change-password', authenticateJWT, changePasswordHandler);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/verify-reset-code', verifyResetCodeHandler);
router.post('/reset-password', resetPasswordHandler);

export default router;
