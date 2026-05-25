import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../lib/api';
import { toast } from 'sonner';

type ViewMode = 'login' | 'forgot-password' | 'verify-code' | 'reset-password' | 'success';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // 视图模式
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  
  // 登录表单
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // 忘记密码表单
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated === true) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error('请填写手机号和密码');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login(phone, password);
      if (res.success && res.data?.token) {
        login(res.data.token);
        toast.success('登录成功！欢迎回来 🎉');
        navigate('/', { replace: true });
      } else {
        toast.error(res.message || '手机号或密码错误');
      }
    } catch {
      toast.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 发送验证码
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPhone) {
      toast.error('请输入手机号码');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(resetPhone);
      if (res.success) {
        toast.success('验证码已发送至您的手机');
        if (res.data?.token) {
          setResetToken(res.data.token);
        }
        setViewMode('verify-code');
      } else {
        toast.error(res.message || '发送失败，请稍后重试');
      }
    } catch {
      toast.error('发送失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 验证验证码
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode || resetCode.length !== 6) {
      toast.error('请输入6位验证码');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.verifyResetCode(resetToken, resetCode);
      if (res.success && res.data?.valid) {
        toast.success('验证成功');
        setViewMode('reset-password');
      } else {
        toast.error(res.message || '验证码无效');
      }
    } catch {
      toast.error('验证失败，请检查验证码');
    } finally {
      setLoading(false);
    }
  };

  // 重置密码
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error('请填写所有字段');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('密码至少需要6个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.resetPassword(resetToken, resetCode, newPassword, confirmPassword);
      if (res.success) {
        toast.success('密码重置成功！');
        setViewMode('success');
      } else {
        toast.error(res.message || '重置失败，请稍后重试');
      }
    } catch {
      toast.error('重置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 渲染步骤指示器
  const renderStepIndicator = () => {
    const steps = [
      { key: 'forgot-password', label: '输入手机号' },
      { key: 'verify-code', label: '验证身份' },
      { key: 'reset-password', label: '重置密码' },
    ];
    const currentIndex = steps.findIndex((s) => s.key === viewMode);

    return (
      <div className="flex items-center justify-center mb-6">
        {steps.map((s, index) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index <= currentIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {index + 1}
            </div>
            <span
              className={`ml-2 text-sm ${
                index <= currentIndex ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {s.label}
            </span>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-3 ${
                  index < currentIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // 渲染登录表单
  const renderLoginForm = () => (
    <div>
      <h2 className="font-heading font-semibold text-xl text-foreground mb-6">登录账户</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">手机号码</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="13800138000"
            autoComplete="tel"
            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-foreground">密码</label>
            <button
              type="button"
              onClick={() => {
                setResetPhone(phone);
                setViewMode('forgot-password');
              }}
              className="text-xs text-primary hover:underline"
            >
              忘记密码？
            </button>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            autoComplete="current-password"
            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 mt-2"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-6">
        还没有账户？{' '}
        <Link to="/signup" className="text-primary font-semibold hover:underline">
          立即注册
        </Link>
      </p>
    </div>
  );

  // 渲染忘记密码表单
  const renderForgotPasswordForm = () => (
    <div>
      {renderStepIndicator()}
      <form onSubmit={handleSendCode} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">手机号码</label>
          <input
            type="tel"
            value={resetPhone}
            onChange={(e) => setResetPhone(e.target.value)}
            placeholder="13800138000"
            autoComplete="tel"
            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
          <p className="text-xs text-muted-foreground mt-2">
            我们将向此手机号发送验证码以验证您的身份
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setViewMode('login')}
            className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-semibold text-sm hover:bg-muted/80 transition-all duration-200"
          >
            返回
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading ? '发送中...' : '发送验证码'}
          </button>
        </div>
      </form>
    </div>
  );

  // 渲染验证码验证表单
  const renderVerifyCodeForm = () => (
    <div>
      {renderStepIndicator()}
      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">验证码</label>
          <input
            type="text"
            value={resetCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setResetCode(value);
            }}
            placeholder="请输入6位验证码"
            maxLength={6}
            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-center text-2xl tracking-[0.5em] font-mono"
          />
          <p className="text-xs text-muted-foreground mt-2">
            验证码已发送至 {resetPhone}，有效期1小时
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setViewMode('forgot-password')}
            className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-semibold text-sm hover:bg-muted/80 transition-all duration-200"
          >
            返回
          </button>
          <button
            type="submit"
            disabled={loading || resetCode.length !== 6}
            className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading ? '验证中...' : '验证'}
          </button>
        </div>
        <button
          type="button"
          onClick={handleSendCode}
          disabled={loading}
          className="w-full text-sm text-primary hover:underline"
        >
          重新发送验证码
        </button>
      </form>
    </div>
  );

  // 渲染重置密码表单
  const renderResetPasswordForm = () => (
    <div>
      {renderStepIndicator()}
      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">新密码</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="请输入新密码（至少6个字符）"
            autoComplete="new-password"
            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">确认密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入新密码"
            autoComplete="new-password"
            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setViewMode('verify-code')}
            className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-semibold text-sm hover:bg-muted/80 transition-all duration-200"
          >
            返回
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading ? '重置中...' : '重置密码'}
          </button>
        </div>
      </form>
    </div>
  );

  // 渲染成功页面
  const renderSuccess = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">密码重置成功！</h3>
        <p className="text-sm text-muted-foreground">
          您的密码已成功重置，现在可以使用新密码登录了
        </p>
      </div>
      <button
        onClick={() => {
          setViewMode('login');
          setPhone(resetPhone);
          setPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setResetCode('');
          setResetToken('');
        }}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 shadow-md"
      >
        前往登录
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="font-heading font-bold text-2xl text-foreground">智能存钱</h1>
          <p className="text-muted-foreground text-sm mt-1">大学生智能存钱系统</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {viewMode === 'login' && renderLoginForm()}
          {viewMode === 'forgot-password' && renderForgotPasswordForm()}
          {viewMode === 'verify-code' && renderVerifyCodeForm()}
          {viewMode === 'reset-password' && renderResetPasswordForm()}
          {viewMode === 'success' && renderSuccess()}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">数据安全加密存储 · © 2026 智能存钱</p>
      </div>
    </div>
  );
};

export default Login;
