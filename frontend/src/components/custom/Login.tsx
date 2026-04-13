import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../lib/api';
import { toast } from 'sonner';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated === true) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('请填写邮筱和密码');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      if (res.success && res.data?.token) {
        login(res.data.token);
        toast.success('登录成功！欢迎回来 🎉');
        navigate('/', { replace: true });
      } else {
        toast.error(res.message || '邮筱或密码错误');
      }
    } catch {
      toast.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="font-heading font-semibold text-xl text-foreground mb-6">登录账户</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">邮箱地址</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">密码</label>
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

        <p className="text-center text-xs text-muted-foreground mt-6">数据安全加密存储 · © 2026 智能存钱</p>
      </div>
    </div>
  );
};

export default Login;
