// Agent节点：营养师Agent
const axios = require('axios');
const logger = require('../../monitoring/logger');
const metricsCollector = require('../../monitoring/metrics');
const { hybridRetriever } = require('../../rag');
const nutritionPrompt = require('../prompts/nutrition');
const agentConfig = require('../../config/agent.config');

/**
 * 营养师Agent节点
 */
async function nutritionAgentNode(state) {
  const { messages } = state;
  const userMessage = messages[messages.length - 1].content;

  logger.info('营养师Agent处理开始', { message: userMessage });
  const startTime = Date.now();

  try {
    // 1. RAG检索相关营养知识
    const knowledge = await hybridRetriever.retrieve(userMessage, 'nutrition');
    const knowledgeContext = hybridRetriever.formatContext(knowledge);

    logger.info('营养知识检索完成', { resultsCount: knowledge.length });

    // 2. 构建Prompt
    const systemPrompt = nutritionPrompt.replace('{knowledge}', knowledgeContext);

    // 3. 调用GLM-4-Flash
    const response = await callGLM4(systemPrompt, userMessage);

    const duration = Date.now() - startTime;

    // 4. 记录指标
    metricsCollector.recordAgentCall('nutrition_agent');
    logger.logAgentCall('nutrition_agent', userMessage, response, duration);

    // 5. 添加回复到消息列表
    return {
      ...state,
      messages: [
        ...messages,
        {
          role: 'assistant',
          content: response,
          metadata: {
            agent: 'nutrition_agent',
            knowledgeUsed: knowledge.length,
            duration,
          },
        },
      ],
    };
  } catch (error) {
    logger.error('营养师Agent处理失败', { error: error.message });

    // 降级：返回通用回复
    return {
      ...state,
      messages: [
        ...messages,
        {
          role: 'assistant',
          content: '抱歉，我现在有点忙，请稍后再试。或者你可以换个问题问我😊',
          metadata: {
            agent: 'nutrition_agent',
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
  const config = agentConfig.agents.nutrition;

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

module.exports = nutritionAgentNode;
