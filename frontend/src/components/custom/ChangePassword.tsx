import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../lib/api';
import { toast } from 'sonner';

const ChangePassword = () => {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('请填写所有字段');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('新密码至少需要6个字符');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }

    if (oldPassword === newPassword) {
      toast.error('新密码不能与原密码相同');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.changePassword(oldPassword, newPassword, confirmPassword);
      if (res.success) {
        toast.success('密码修改成功！');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        toast.error(res.message || '修改失败，请稍后重试');
      }
    } catch {
      toast.error('修改失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8">
          <div className="text-center mb-8">
            <h1 className="font-heading font-bold text-2xl text-foreground mb-2">修改密码</h1>
            <p className="text-sm text-muted-foreground">请填写以下信息以修改密码</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">原密码</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="请输入原密码"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-semibold text-sm hover:bg-muted/80 transition-all duration-200"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200 shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {loading ? '提交中...' : '确认修改'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;