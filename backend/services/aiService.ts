import axios from 'axios';

// AI服务配置
const AI_SERVICE = process.env.AI_SERVICE || 'kimi';

// Kimi AI配置
const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_MODEL = process.env.KIMI_MODEL || 'moonshot-v1-8k';

// 豆包AI配置（备用）
const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || '';
const DOUBAO_ENDPOINT_ID = process.env.DOUBAO_ENDPOINT_ID || '';

interface DailyBudgetSuggestion {
  dayOfWeek: number;
  dayName: string;
  suggestedAmount: number;
  reason: string;
}

interface MonthlyBudgetPlan {
  totalIncome: number;
  suggestedSavings: number;
  suggestedSavingsRate: number;
  monthlyBudget: number;
  dailyBudget: number;
  suggestions: DailyBudgetSuggestion[];
  summary: string;
  advice: string;
}

export class AIService {
  /**
   * 让AI制定完整的月度预算计划
   * @param totalIncome 月度总收入
   * @param pastSpendingPatterns 历史消费模式
   * @returns 完整的月度预算计划
   */
  async createMonthlyBudgetPlan(
    totalIncome: number,
    pastSpendingPatterns?: { dayOfWeek: number; avgAmount: number }[]
  ): Promise<MonthlyBudgetPlan> {
    console.log(`🔄 正在使用 ${AI_SERVICE.toUpperCase()} AI 制定月度预算计划...`);
    
    // 根据配置选择AI服务
    if (AI_SERVICE === 'kimi') {
      return this.createMonthlyBudgetPlanWithKimi(totalIncome, pastSpendingPatterns);
    } else {
      return this.createMonthlyBudgetPlanWithDoubao(totalIncome, pastSpendingPatterns);
    }
  }

  /**
   * 使用Kimi AI制定月度预算计划
   */
  private async createMonthlyBudgetPlanWithKimi(
    totalIncome: number,
    pastSpendingPatterns?: { dayOfWeek: number; avgAmount: number }[]
  ): Promise<MonthlyBudgetPlan> {
    if (!KIMI_API_KEY) {
      console.warn('⚠️ Kimi AI API密钥未配置，使用智能预算分配策略');
      return this.getDefaultBudgetPlan(totalIncome);
    }
    
    const spendingPatternStr = pastSpendingPatterns 
      ? pastSpendingPatterns.map(p => `${p.dayOfWeek === 0 ? '周日' : p.dayOfWeek === 1 ? '周一' : p.dayOfWeek === 2 ? '周二' : p.dayOfWeek === 3 ? '周三' : p.dayOfWeek === 4 ? '周四' : p.dayOfWeek === 5 ? '周五' : '周六'}平均花费${p.avgAmount}元`).join('，')
      : '暂无历史消费记录';

    const prompt = `
你是Kimi，一个专业的智能理财顾问。请帮用户制定一个完整的月度预算计划。

用户信息：
- 月度总收入：${totalIncome}元
- 历史消费模式：${spendingPatternStr}

请按照以下要求制定预算：
1. 建议一个合理的储蓄比例（通常建议20%-50%）
2. 计算每月可支配预算（收入 - 储蓄）
3. 根据星期几动态分配每日可支配金额：
   - 周一、周二、周四、周五可以少分配一些（权重0.8）
   - 周三、周六、周日可以多分配一些（权重1.2）
4. 提供详细的理财建议

请以JSON格式输出，包含以下字段：
- totalIncome: 月度总收入
- suggestedSavings: 建议储蓄金额
- suggestedSavingsRate: 建议储蓄比例（0-1之间的小数）
- monthlyBudget: 每月可支配预算
- dailyBudget: 平均每日预算
- suggestions: 数组，每个元素包含dayOfWeek(0-6，0是周日)、dayName(如"周一")、suggestedAmount(建议金额)、reason(建议理由)
- summary: 整体分配策略总结
- advice: 理财建议

输出示例：
{
  "totalIncome": 3000,
  "suggestedSavings": 1000,
  "suggestedSavingsRate": 0.33,
  "monthlyBudget": 2000,
  "dailyBudget": 66.67,
  "suggestions": [
    {"dayOfWeek": 0, "dayName": "周日", "suggestedAmount": 80, "reason": "周末活动较多，可适当增加预算"},
    {"dayOfWeek": 1, "dayName": "周一", "suggestedAmount": 53, "reason": "工作日消费较少"},
    {"dayOfWeek": 2, "dayName": "周二", "suggestedAmount": 53, "reason": "工作日消费较少"},
    {"dayOfWeek": 3, "dayName": "周三", "suggestedAmount": 80, "reason": "周三可以适当放松"},
    {"dayOfWeek": 4, "dayName": "周四", "suggestedAmount": 53, "reason": "工作日消费较少"},
    {"dayOfWeek": 5, "dayName": "周五", "suggestedAmount": 53, "reason": "工作日消费较少"},
    {"dayOfWeek": 6, "dayName": "周六", "suggestedAmount": 80, "reason": "周末活动较多"}
  ],
  "summary": "根据您的收入情况，建议每月储蓄1000元（33%），剩余2000元作为可支配预算",
  "advice": "建议您每天控制消费，周末可以适当放松，但也要注意节约。坚持储蓄习惯，未来会有不错的回报。"
}
`;

    try {
      console.log('🔄 正在调用Kimi AI制定月度预算计划...');
      console.log('📋 API_KEY配置状态:', KIMI_API_KEY ? '已配置' : '未配置');
      console.log('📋 模型:', KIMI_MODEL);
      
      const response = await axios.post(
        'https://api.moonshot.cn/v1/chat/completions',
        {
          model: KIMI_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${KIMI_API_KEY}`,
          },
        }
      );

      console.log('📡 Kimi AI响应状态:', response.status);
      console.log('📡 Kimi AI响应数据:', JSON.stringify(response.data).substring(0, 500));
      
      if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
        const aiContent = response.data.choices[0].message.content;
        console.log('✅ 成功获取Kimi AI预算计划');
        console.log('📋 Kimi返回内容:', aiContent.substring(0, 200) + '...');
        
        // 尝试解析JSON
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Kimi返回内容中未找到有效的JSON格式');
      }
      throw new Error('Kimi返回数据格式不正确');
    } catch (error: any) {
      console.error('❌ 调用Kimi AI失败:', error.message);
      if (error.response) {
        console.error('❌ HTTP状态:', error.response.status);
        console.error('❌ 响应数据:', JSON.stringify(error.response.data));
      }
      // 返回默认预算计划
      return this.getDefaultBudgetPlan(totalIncome);
    }
  }

  /**
   * 使用豆包AI制定月度预算计划（备用）
   */
  private async createMonthlyBudgetPlanWithDoubao(
    totalIncome: number,
    pastSpendingPatterns?: { dayOfWeek: number; avgAmount: number }[]
  ): Promise<MonthlyBudgetPlan> {
    if (!DOUBAO_API_KEY) {
      throw new Error('豆包AI API密钥未配置，请在.env文件中设置DOUBAO_API_KEY');
    }
    
    if (!DOUBAO_ENDPOINT_ID) {
      console.warn('⚠️ 豆包AI推理接入点ID未配置，使用默认预算计划');
      return this.getDefaultBudgetPlan(totalIncome);
    }
    
    const spendingPatternStr = pastSpendingPatterns 
      ? pastSpendingPatterns.map(p => `${p.dayOfWeek === 0 ? '周日' : p.dayOfWeek === 1 ? '周一' : p.dayOfWeek === 2 ? '周二' : p.dayOfWeek === 3 ? '周三' : p.dayOfWeek === 4 ? '周四' : p.dayOfWeek === 5 ? '周五' : '周六'}平均花费${p.avgAmount}元`).join('，')
      : '暂无历史消费记录';

    const prompt = `
你是豆包，一个专业的智能理财顾问，请帮用户制定一个完整的月度预算计划。

用户信息：
- 月度总收入：${totalIncome}元
- 历史消费模式：${spendingPatternStr}

请按照以下要求制定预算：
1. 建议一个合理的储蓄比例（通常建议20%-50%）
2. 计算每月可支配预算（收入 - 储蓄）
3. 根据星期几动态分配每日可支配金额：
   - 周一、周二、周四、周五可以少分配一些（权重0.8）
   - 周三、周六、周日可以多分配一些（权重1.2）
4. 提供详细的理财建议

请以JSON格式输出，包含以下字段：
- totalIncome: 月度总收入
- suggestedSavings: 建议储蓄金额
- suggestedSavingsRate: 建议储蓄比例（0-1之间的小数）
- monthlyBudget: 每月可支配预算
- dailyBudget: 平均每日预算
- suggestions: 数组，每个元素包含dayOfWeek(0-6，0是周日)、dayName(如"周一")、suggestedAmount(建议金额)、reason(建议理由)
- summary: 整体分配策略总结
- advice: 理财建议

输出示例：
{
  "totalIncome": 3000,
  "suggestedSavings": 1000,
  "suggestedSavingsRate": 0.33,
  "monthlyBudget": 2000,
  "dailyBudget": 66.67,
  "suggestions": [
    {"dayOfWeek": 0, "dayName": "周日", "suggestedAmount": 80, "reason": "周末活动较多，可适当增加预算"},
    {"dayOfWeek": 1, "dayName": "周一", "suggestedAmount": 53, "reason": "工作日消费较少"},
    {"dayOfWeek": 2, "dayName": "周二", "suggestedAmount": 53, "reason": "工作日消费较少"},
    {"dayOfWeek": 3, "dayName": "周三", "suggestedAmount": 80, "reason": "周三可以适当放松"},
    {"dayOfWeek": 4, "dayName": "周四", "suggestedAmount": 53, "reason": "工作日消费较少"},
    {"dayOfWeek": 5, "dayName": "周五", "suggestedAmount": 53, "reason": "工作日消费较少"},
    {"dayOfWeek": 6, "dayName": "周六", "suggestedAmount": 80, "reason": "周末活动较多"}
  ],
  "summary": "根据您的收入情况，建议每月储蓄1000元（33%），剩余2000元作为可支配预算",
  "advice": "建议您每天控制消费，周末可以适当放松，但也要注意节约。坚持储蓄习惯，未来会有不错的回报。"
}
`;

    try {
      console.log('🔄 正在调用豆包AI制定月度预算计划...');
      
      const response = await axios.post(
        'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
        {
          model: DOUBAO_ENDPOINT_ID,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DOUBAO_API_KEY}`,
          },
        }
      );

      if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
        const aiContent = response.data.choices[0].message.content;
        
        // 尝试解析JSON
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('豆包返回内容中未找到有效的JSON格式');
      }
      throw new Error('豆包返回数据格式不正确');
    } catch (error: any) {
      console.error('❌ 调用豆包AI失败:', error.message);
      if (error.response) {
        console.error('❌ HTTP状态:', error.response.status);
        console.error('❌ 响应数据:', JSON.stringify(error.response.data));
      }
      return this.getDefaultBudgetPlan(totalIncome);
    }
  }

  /**
   * 获取每日预算建议
   */
  async getDailyBudgetSuggestion(
    monthlyBudget: number,
    remainingBudget: number,
    remainingDays: number,
    date: Date,
    pastSpendingPatterns?: { dayOfWeek: number; avgAmount: number }[]
  ): Promise<{ amount: number; reason: string; summary: string }> {
    console.log(`🔄 正在使用 ${AI_SERVICE.toUpperCase()} AI 获取每日预算建议...`);
    
    if (AI_SERVICE === 'kimi') {
      return this.getDailyBudgetSuggestionWithKimi(monthlyBudget, remainingBudget, remainingDays, date, pastSpendingPatterns);
    } else {
      return this.getDailyBudgetSuggestionWithDoubao(monthlyBudget, remainingBudget, remainingDays, date, pastSpendingPatterns);
    }
  }

  /**
   * 使用Kimi AI获取每日预算建议
   */
  private async getDailyBudgetSuggestionWithKimi(
    monthlyBudget: number,
    remainingBudget: number,
    remainingDays: number,
    date: Date,
    pastSpendingPatterns?: { dayOfWeek: number; avgAmount: number }[]
  ): Promise<{ amount: number; reason: string; summary: string }> {
    if (!KIMI_API_KEY) {
      console.warn('⚠️ Kimi AI API密钥未配置，使用默认预算分配');
      return this.getDefaultDailyBudget(remainingBudget, remainingDays, date);
    }
    
    const dayOfWeek = date.getDay();
    const dayName = dayOfWeek === 0 ? '周日' : dayOfWeek === 1 ? '周一' : dayOfWeek === 2 ? '周二' : dayOfWeek === 3 ? '周三' : dayOfWeek === 4 ? '周四' : dayOfWeek === 5 ? '周五' : '周六';
    
    const spendingPatternStr = pastSpendingPatterns 
      ? pastSpendingPatterns.map(p => `${p.dayOfWeek === 0 ? '周日' : p.dayOfWeek === 1 ? '周一' : p.dayOfWeek === 2 ? '周二' : p.dayOfWeek === 3 ? '周三' : p.dayOfWeek === 4 ? '周四' : p.dayOfWeek === 5 ? '周五' : '周六'}平均花费${p.avgAmount}元`).join('，')
      : '暂无历史消费记录';

    const prompt = `
你是Kimi，一个专业的智能理财助手。请为用户提供今日的可支配金额建议。

用户信息：
- 月度总预算：${monthlyBudget}元
- 剩余预算：${remainingBudget}元
- 本月剩余天数：${remainingDays}天
- 今天是：${dayName}
- 历史消费模式：${spendingPatternStr}

请按照以下规则分配今日预算：
1. 周一、周二、周四、周五可以少分配一些
2. 周三、周六、周日可以多分配一些
3. 分配金额不能导致后续天数预算不足

请以JSON格式输出：
{
  "amount": 建议金额,
  "reason": "分配理由",
  "summary": "简短总结"
}
`;

    try {
      console.log('🔄 正在调用Kimi AI获取今日预算建议...');
      const response = await axios.post(
        'https://api.moonshot.cn/v1/chat/completions',
        {
          model: KIMI_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${KIMI_API_KEY}`,
          },
        }
      );

      if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
        const aiContent = response.data.choices[0].message.content;
        console.log('✅ 成功获取Kimi AI今日预算建议');
        
        // 尝试解析JSON
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Kimi返回内容中未找到有效的JSON格式');
      }
      throw new Error('Kimi返回数据格式不正确');
    } catch (error: any) {
      console.error('❌ 调用Kimi AI失败:', error.message);
      if (error.response) {
        console.error('❌ HTTP状态:', error.response.status);
        console.error('❌ 响应数据:', JSON.stringify(error.response.data));
      }
      return this.getDefaultDailyBudget(remainingBudget, remainingDays, date);
    }
  }

  /**
   * 使用豆包AI获取每日预算建议（备用）
   */
  private async getDailyBudgetSuggestionWithDoubao(
    monthlyBudget: number,
    remainingBudget: number,
    remainingDays: number,
    date: Date,
    pastSpendingPatterns?: { dayOfWeek: number; avgAmount: number }[]
  ): Promise<{ amount: number; reason: string; summary: string }> {
    if (!DOUBAO_API_KEY) {
      throw new Error('豆包AI API密钥未配置');
    }
    
    if (!DOUBAO_ENDPOINT_ID) {
      return this.getDefaultDailyBudget(remainingBudget, remainingDays, date);
    }
    
    const dayOfWeek = date.getDay();
    const dayName = dayOfWeek === 0 ? '周日' : dayOfWeek === 1 ? '周一' : dayOfWeek === 2 ? '周二' : dayOfWeek === 3 ? '周三' : dayOfWeek === 4 ? '周四' : dayOfWeek === 5 ? '周五' : '周六';
    
    const spendingPatternStr = pastSpendingPatterns 
      ? pastSpendingPatterns.map(p => `${p.dayOfWeek === 0 ? '周日' : p.dayOfWeek === 1 ? '周一' : p.dayOfWeek === 2 ? '周二' : p.dayOfWeek === 3 ? '周三' : p.dayOfWeek === 4 ? '周四' : p.dayOfWeek === 5 ? '周五' : '周六'}平均花费${p.avgAmount}元`).join('，')
      : '暂无历史消费记录';

    const prompt = `
你是豆包，一个专业的智能理财助手。请为用户提供今日的可支配金额建议。

用户信息：
- 月度总预算：${monthlyBudget}元
- 剩余预算：${remainingBudget}元
- 本月剩余天数：${remainingDays}天
- 今天是：${dayName}
- 历史消费模式：${spendingPatternStr}

请按照以下规则分配今日预算：
1. 周一、周二、周四、周五可以少分配一些
2. 周三、周六、周日可以多分配一些
3. 分配金额不能导致后续天数预算不足

请以JSON格式输出：
{
  "amount": 建议金额,
  "reason": "分配理由",
  "summary": "简短总结"
}
`;

    try {
      console.log('🔄 正在调用豆包AI获取今日预算建议...');
      const response = await axios.post(
        'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
        {
          model: DOUBAO_ENDPOINT_ID,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DOUBAO_API_KEY}`,
          },
        }
      );

      if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
        const aiContent = response.data.choices[0].message.content;
        
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('豆包返回内容中未找到有效的JSON格式');
      }
      throw new Error('豆包返回数据格式不正确');
    } catch (error: any) {
      console.error('❌ 调用豆包AI失败:', error.message);
      return this.getDefaultDailyBudget(remainingBudget, remainingDays, date);
    }
  }

  /**
   * 获取默认每日预算
   */
  private getDefaultDailyBudget(remainingBudget: number, remainingDays: number, date: Date): { amount: number; reason: string; summary: string } {
    const dayOfWeek = date.getDay();
    const baseAmount = remainingBudget / remainingDays;
    const weight = (dayOfWeek === 0 || dayOfWeek === 3 || dayOfWeek === 6) ? 1.2 : 0.8;
    return {
      amount: Math.round(baseAmount * weight * 100) / 100,
      reason: dayOfWeek === 0 || dayOfWeek === 3 || dayOfWeek === 6 ? '周末或周三，可适当增加预算' : '工作日，消费较少',
      summary: 'AI服务暂不可用，使用默认分配策略'
    };
  }

  /**
   * 默认预算计划（当AI服务不可用时使用）
   */
  private getDefaultBudgetPlan(totalIncome: number): MonthlyBudgetPlan {
    const suggestedSavingsRate = 0.3;
    const suggestedSavings = Math.round(totalIncome * suggestedSavingsRate);
    const monthlyBudget = totalIncome - suggestedSavings;
    const dailyBudget = Math.round((monthlyBudget / 30) * 100) / 100;

    const WEEKDAY_WEIGHTS: Record<number, { weight: number; name: string }> = {
      0: { weight: 1.2, name: '周日' },
      1: { weight: 0.8, name: '周一' },
      2: { weight: 0.8, name: '周二' },
      3: { weight: 1.2, name: '周三' },
      4: { weight: 0.8, name: '周四' },
      5: { weight: 0.8, name: '周五' },
      6: { weight: 1.2, name: '周六' },
    };

    const suggestions: DailyBudgetSuggestion[] = [];
    
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const config = WEEKDAY_WEIGHTS[dayOfWeek];
      suggestions.push({
        dayOfWeek,
        dayName: config.name,
        suggestedAmount: Math.round((dailyBudget * config.weight) * 100) / 100,
        reason: config.weight > 1 ? '周末或周三，活动较多' : '工作日，消费较少',
      });
    }

    return {
      totalIncome,
      suggestedSavings,
      suggestedSavingsRate,
      monthlyBudget,
      dailyBudget,
      suggestions,
      summary: `根据您的收入情况，建议每月储蓄${suggestedSavings}元（${(suggestedSavingsRate * 100).toFixed(0)}%），剩余${monthlyBudget}元作为可支配预算`,
      advice: '建议您每天控制消费，周末可以适当放松，但也要注意节约。坚持储蓄习惯，未来会有不错的回报。'
    };
  }
}

export const aiService = new AIService();
export type { MonthlyBudgetPlan };