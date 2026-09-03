// Agent节点：通用回复
const axios = require('axios');
const logger = require('../../monitoring/logger');
const metricsCollector = require('../../monitoring/metrics');
const agentConfig = require('../../config/agent.config');

/**
 * 通用回复Agent节点
 * 处理无法明确分类的问题或闲聊
 */
async function generalReplyNode(state) {
  const { messages } = state;
  const userMessage = messages[messages.length - 1].content;

  logger.info('通用回复Agent处理开始', { message: userMessage });
  const startTime = Date.now();

  try {
    // 通用System Prompt
    const systemPrompt = `你是"慢慢瘦"AI私教团队的助手"小瘦"。

你的团队包括：
- 小营（营养师）：负责饮食、热量、营养相关问题
- 小练（健身教练）：负责运动、训练、健身计划相关问题

当用户的问题不明确时，你需要：
1. 友好地和用户打招呼
2. 了解用户的具体需求（减脂目标、饮食还是运动问题）
3. 引导用户提供更多信息
4. 如果是闲聊，简短回复并引导回到减脂话题

回复要简短、友好、有亲和力😊`;

    // 调用GLM-4-Flash
    const response = await callGLM4(systemPrompt, userMessage);

    const duration = Date.now() - startTime;

    // 记录指标
    metricsCollector.recordAgentCall('general_agent');
    logger.logAgentCall('general_agent', userMessage, response, duration);

    // 添加回复到消息列表
    return {
      ...state,
      messages: [
        ...messages,
        {
          role: 'assistant',
          content: response,
          metadata: {
            agent: 'general_agent',
            duration,
          },
        },
      ],
    };
  } catch (error) {
    logger.error('通用回复Agent处理失败', { error: error.message });

    // 兜底回复
    return {
      ...state,
      messages: [
        ...messages,
        {
          role: 'assistant',
          content: '你好！我是慢慢瘦AI私教小瘦😊\n\n你可以问我：\n- 饮食相关：热量、食物、营养素配比\n- 运动相关：训练计划、动作指导、减脂方法\n\n有什么可以帮你的吗？',
          metadata: {
            agent: 'general_agent',
            error: true,
          },
        },
      ],
    };
  }
}

/**
 * 调用GLM-4-Flash API
 */
async function callGLM4(systemPrompt, userMessage) {
  const config = agentConfig.agents.general;

  const response = await axios.post(
    'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const reply = response.data.choices[0].message.content;
  const usage = response.data.usage;

  // 记录LLM调用
  metricsCollector.recordLLMCall(config.model, {
    prompt: usage.prompt_tokens,
    completion: usage.completion_tokens,
    total: usage.total_tokens,
  });

  return reply;
}

module.exports = generalReplyNode;
