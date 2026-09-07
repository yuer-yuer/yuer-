/**
 * 智能路由节点 - LLM动态决策
 */

const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const logger = require('../../../../utils/logger');

// 路由专用LLM（低温度，更确定的决策）
const routerLLM = new ChatOpenAI({
  configuration: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
  apiKey: process.env.DASHSCOPE_API_KEY,
  model: 'qwen-plus',
  temperature: 0.3,
});

/**
 * 智能路由节点 - LLM动态决策使用哪些Agent
 */
async function router_node(state) {
  const { userQuery } = state;

  const systemPrompt = `你是一个智能任务分析器，负责决定如何调度四个专业Agent：

**可用Agent**：
1. nutrition_agent - 营养专家（回答营养问题、分析饮食健康、提供饮食建议）
2. fitness_agent - 运动教练（回答运动问题、制定训练计划、分析运动效果）
3. tool_agent - 数据工具（记录饮食/运动/体重、查询历史数据、搜索食物热量）
4. general_agent - 通用助手（问候、闲聊、无法分类的问题、引导用户）

**执行模式**：
- single: 单个Agent独立处理（纯咨询、纯操作、闲聊）
- sequential: 多个Agent串行执行（需要前一个Agent的结果，如：先记录再分析）
- parallel: 多个Agent并行执行（可以同时工作，如：同时分析饮食和运动）

**决策规则**：
- 问候/闲聊/不明确问题 → single模式 + general_agent
- 纯咨询问题 → single模式 + 对应专家
- 记录/查询操作 → single模式 + tool_agent
- 记录后需要分析 → sequential模式 + [tool_agent, 对应专家]
- 综合分析健康数据 → sequential模式 + [tool_agent] 然后parallel模式 + [nutrition_agent, fitness_agent]

返回严格的JSON格式（不要有额外文字）：
{
  "agents": ["agent名称数组"],
  "mode": "single/sequential/parallel",
  "reasoning": "你的推理过程"
}`;

  const userPrompt = `用户需求: "${userQuery}"

请分析并返回执行计划。`;

  try {
    logger.info('Router节点: 开始LLM路由决策', { userQuery });

    const response = await routerLLM.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);

    // 解析LLM返回的JSON
    let content = response.content.trim();

    // 移除可能的markdown代码块标记
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    const decision = JSON.parse(content);

    logger.info('路由决策完成', decision);

    return {
      routingDecision: decision,
      messages: state.messages.concat([
        { role: 'system', content: `路由决策: ${decision.reasoning}` }
      ]),
      executionFlow: state.executionFlow.concat(['router'])
    };
  } catch (error) {
    logger.error('路由决策失败', { error: error.message });

    // 降级策略：关键词匹配
    const fallbackDecision = fallbackRouting(userQuery);

    logger.info('使用降级路由', fallbackDecision);

    return {
      routingDecision: fallbackDecision,
      messages: state.messages.concat([
        { role: 'system', content: `降级路由: ${fallbackDecision.reasoning}` }
      ]),
      executionFlow: state.executionFlow.concat(['router(fallback)'])
    };
  }
}

/**
 * 降级路由策略（当LLM失败时）
 */
function fallbackRouting(query) {
  const keywords = {
    tool: ['记录', '查询', '今天吃了', '今天运动', '体重', '历史'],
    nutrition: ['营养', '饮食', '吃', '热量', '卡路里', '减肥餐'],
    fitness: ['运动', '健身', '锻炼', '练', '跑步', '训练'],
    greeting: ['你好', '嗨', 'hi', 'hello', '在吗', '在不在']
  };

  const hasTool = keywords.tool.some(kw => query.includes(kw));
  const hasNutrition = keywords.nutrition.some(kw => query.includes(kw));
  const hasFitness = keywords.fitness.some(kw => query.includes(kw));
  const hasGreeting = keywords.greeting.some(kw => query.toLowerCase().includes(kw));

  // 问候/闲聊
  if (hasGreeting) {
    return {
      agents: ['general_agent'],
      mode: 'single',
      reasoning: '检测到问候或闲聊'
    };
  }

  // 记录+分析
  if (hasTool && (hasNutrition || hasFitness)) {
    return {
      agents: hasFitness ? ['tool_agent', 'fitness_agent'] : ['tool_agent', 'nutrition_agent'],
      mode: 'sequential',
      reasoning: '检测到记录和分析需求，使用串行模式'
    };
  }

  // 纯工具操作
  if (hasTool) {
    return {
      agents: ['tool_agent'],
      mode: 'single',
      reasoning: '检测到数据操作需求'
    };
  }

  // 纯咨询
  if (hasNutrition) {
    return {
      agents: ['nutrition_agent'],
      mode: 'single',
      reasoning: '检测到营养咨询需求'
    };
  }

  if (hasFitness) {
    return {
      agents: ['fitness_agent'],
      mode: 'single',
      reasoning: '检测到运动咨询需求'
    };
  }

  // 无法识别，使用general_agent兜底
  return {
    agents: ['general_agent'],
    mode: 'single',
    reasoning: '无法明确分类，使用通用助手引导'
  };
}

module.exports = { router_node };
