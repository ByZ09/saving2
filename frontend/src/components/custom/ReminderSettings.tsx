import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { reminderApi } from '../../lib/api';

interface ReminderSettingsType {
  dailyLimitReminder: number;
  dailyLimitAmount: number;
  budgetExceedReminder: number;
  savingsGoalReminder: number;
}

export function ReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettingsType>({
    dailyLimitReminder: 1,
    dailyLimitAmount: 0,
    budgetExceedReminder: 1,
    savingsGoalReminder: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await reminderApi.getSettings();
      if (res.success && res.data) {
        setSettings({
          dailyLimitReminder: res.data.dailyLimitReminder,
          dailyLimitAmount: res.data.dailyLimitAmount,
          budgetExceedReminder: res.data.budgetExceedReminder,
          savingsGoalReminder: res.data.savingsGoalReminder,
        });
      }
    } catch (error) {
      toast.error('获取提醒设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await reminderApi.updateSettings(settings);
      if (res.success) {
        toast.success('提醒设置保存成功');
      } else {
        toast.error(res.message || '保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key: keyof ReminderSettingsType) => {
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key] === 1 ? 0 : 1,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">提醒设置</h2>
      
      <div className="space-y-6">
        {/* 每日额度提醒 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800">每日额度提醒</h3>
            <p className="text-sm text-gray-500 mt-1">当今日消费达到设定额度时提醒您</p>
          </div>
          <button
            onClick={() => toggleSetting('dailyLimitReminder')}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
              settings.dailyLimitReminder === 1 ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                settings.dailyLimitReminder === 1 ? 'translate-x-8' : 'translate-x-1'
              }`}
            ></span>
          </button>
        </div>

        {/* 每日额度金额 */}
        {settings.dailyLimitReminder === 1 && (
          <div className="pl-4 pr-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              每日消费额度（元）
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={settings.dailyLimitAmount || ''}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  dailyLimitAmount: parseFloat(e.target.value) || 0,
                }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="设置每日消费额度"
            />
          </div>
        )}

        {/* 超预算提醒 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800">超预算提醒</h3>
            <p className="text-sm text-gray-500 mt-1">当本月预算超支时提醒您</p>
          </div>
          <button
            onClick={() => toggleSetting('budgetExceedReminder')}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
              settings.budgetExceedReminder === 1 ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                settings.budgetExceedReminder === 1 ? 'translate-x-8' : 'translate-x-1'
              }`}
            ></span>
          </button>
        </div>

        {/* 存钱目标达成提醒 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800">存钱目标达成提醒</h3>
            <p className="text-sm text-gray-500 mt-1">当达成月度存钱目标时提醒您</p>
          </div>
          <button
            onClick={() => toggleSetting('savingsGoalReminder')}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
              settings.savingsGoalReminder === 1 ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                settings.savingsGoalReminder === 1 ? 'translate-x-8' : 'translate-x-1'
              }`}
            ></span>
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full mt-6 px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {saving ? '保存中...' : '保存设置'}
      </button>
    </div>
  );
}