import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const DataExport = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 通用导出函数
  const handleExport = async (type: string, fileName: string) => {
    setLoading(type);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`/api/export/${type}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`${fileName} 导出成功`);
    } catch (error) {
      toast.error('导出失败，请重试');
    } finally {
      setLoading(null);
    }
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/json') {
        toast.error('请选择JSON格式的备份文件');
        return;
      }
      setSelectedFile(file);
    }
  };

  // 处理数据恢复
  const handleRestore = async () => {
    if (!selectedFile) {
      toast.error('请先选择备份文件');
      return;
    }

    setRestoreLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const content = await selectedFile.text();
      const backupData = JSON.parse(content);

      const response = await fetch('/api/export/restore', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backupData)
      });

      const result = await response.json();
      if (result.success) {
        toast.success('数据恢复成功');
        setSelectedFile(null);
      } else {
        toast.error(result.message || '恢复失败');
      }
    } catch (error) {
      toast.error('恢复失败，请检查备份文件格式');
    } finally {
      setRestoreLoading(false);
    }
  };

  const exportButtons = [
    { type: 'expenses', label: '导出支出记录', file: '支出记录.csv' },
    { type: 'savings', label: '导出储蓄记录', file: '储蓄记录.csv' },
    { type: 'budgets', label: '导出月度预算', file: '月度预算.csv' },
    { type: 'all', label: '导出全部数据', file: '全部数据.csv' },
    { type: 'backup', label: '下载完整备份', file: '数据备份.json' },
  ];

  return (
    <div className="space-y-6">
      {/* 导出功能 */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">数据导出</h3>
        <p className="text-sm text-muted-foreground mb-4">将您的账单数据导出为CSV或JSON文件，方便查看和备份</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {exportButtons.map(({ type, label, file }) => (
            <Button
              key={type}
              variant="outline"
              className="justify-start"
              onClick={() => handleExport(type, file)}
              disabled={loading === type}
            >
              {loading === type ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  导出中...
                </span>
              ) : (
                <span>{label}</span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-border pt-6">
        <h3 className="font-semibold text-foreground mb-3">数据恢复</h3>
        <p className="text-sm text-muted-foreground mb-4">
          从之前下载的备份文件恢复数据。<span className="text-red-500">注意：此操作将覆盖当前所有数据！</span>
        </p>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="flex-1 text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-secondary file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary/80"
            />
          </div>
          
          {selectedFile && (
            <p className="text-sm text-foreground">
              已选择：<span className="font-medium">{selectedFile.name}</span>
            </p>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={!selectedFile || restoreLoading}
              >
                {restoreLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    恢复中...
                  </span>
                ) : (
                  '恢复数据'
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认恢复数据？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作将覆盖您当前的所有账单数据，包括支出记录、储蓄记录、月度预算和备用金。<br />
                  <span className="text-red-500 font-medium">请确保您已备份当前数据！</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-3">
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestore} className="bg-red-500 hover:bg-red-600">
                  确认恢复
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default DataExport;