// Agent节点：健身教练Agent
const axios = require('axios');
const logger = require('../../monitoring/logger');
const metricsCollector = require('../../monitoring/metrics');
const { hybridRetriever } = require('../../rag');
const fitnessPrompt = require('../prompts/fitness');
const agentConfig = require('../../config/agent.config');
const { executeTool, getAgentTools } = require('../../tools');

/**
 * 健身教练Agent节点（支持Tool调用）
 */
async function fitnessAgentNode(state) {
  const { messages } = state;
  const userMessage = messages[messages.length - 1].content;

  logger.info('健身教练Agent处理开始', { message: userMessage });
  const startTime = Date.now();

  try {
    // 1. RAG检索相关运动知识
    const knowledge = await hybridRetriever.retrieve(userMessage, 'fitness');
    const knowledgeContext = hybridRetriever.formatContext(knowledge);

    logger.info('运动知识检索完成', { resultsCount: knowledge.length });

    // 2. 构建带工具的Prompt
    const availableTools = getAgentTools('fitness');
    const systemPrompt = buildSystemPrompt(fitnessPrompt, knowledgeContext, availableTools);

    // 3. 调用GLM-4-Flash（可能返回工具调用）
    let response = await callGLM4(systemPrompt, userMessage);

    // 4. 检测是否需要工具调用
    const toolCalls = extractToolCalls(response);

    if (toolCalls.length > 0) {
      logger.info('检测到工具调用', { toolCalls });

      // 执行工具
      const toolResults = await executeTools(toolCalls);

      // 将工具结果注入Prompt，重新生成回复
      const toolContext = formatToolResults(toolResults);
      const finalSystemPrompt = systemPrompt + '\n\n' + toolContext;
      response = await callGLM4(finalSystemPrompt, userMessage);
    }

    const duration = Date.now() - startTime;

    // 5. 记录指标
    metricsCollector.recordAgentCall('fitness_agent');
    logger.logAgentCall('fitness_agent', userMessage, response, duration);

    // 6. 添加回复到消息列表
    return {
      ...state,
      messages: [
        ...messages,
        {
          role: 'assistant',
          content: response,
          metadata: {
            agent: 'fitness_agent',
            knowledgeUsed: knowledge.length,
            duration,
          },
        },
      ],
    };
  } catch (error) {
    logger.error('健身教练Agent处理失败', { error: error.message });

    // 降级：返回通用回复
    return {
      ...state,
      messages: [
        ...messages,
        {
          role: 'assistant',
          content: '抱歉，我现在有点忙，请稍后再试。或者你可以换个问题问我💪',
          metadata: {
            agent: 'fitness_agent',
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
  const config = agentConfig.agents.fitness;

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

/**
 * 构建带工具描述的System Prompt
 */
function buildSystemPrompt(basePrompt, knowledgeContext, availableTools) {
  let prompt = basePrompt.replace('{knowledge}', knowledgeContext);

  // 添加工具描述
  if (availableTools.length > 0) {
    prompt += '\n\n你可以使用以下工具来辅助回答：\n';
    availableTools.forEach(tool => {
      prompt += `- ${tool.name}: ${tool.description}\n`;
    });

    prompt += '\n如果需要使用工具，请在回复中包含JSON格式的工具调用，格式如下：\n';
    prompt += '```json\n{"tool": "工具名", "params": {...参数...}}\n```\n';
    prompt += '如果不需要工具，直接回答即可。';
  }

  return prompt;
}

/**
 * 从回复中提取工具调用
 */
function extractToolCalls(response) {
  const toolCalls = [];

  // 匹配JSON代码块
  const jsonBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
  let match;

  while ((match = jsonBlockRegex.exec(response)) !== null) {
    try {
      const toolCall = JSON.parse(match[1]);
      if (toolCall.tool && toolCall.params) {
        toolCalls.push(toolCall);
      }
    } catch (error) {
      logger.warn('解析工具调用失败', { jsonString: match[1] });
    }
  }

  return toolCalls;
}

/**
 * 执行多个工具调用
 */
async function executeTools(toolCalls) {
  const results = [];

  for (const call of toolCalls) {
    try {
      const result = await executeTool(call.tool, call.params);
      results.push({
        tool: call.tool,
        params: call.params,
        result,
      });
    } catch (error) {
      logger.error('工具执行失败', { tool: call.tool, error: error.message });
      results.push({
        tool: call.tool,
        params: call.params,
        result: { success: false, error: error.message },
      });
    }
  }

  return results;
}

/**
 * 格式化工具执行结果
 */
function formatToolResults(toolResults) {
  let context = '【工具执行结果】\n\n';

  toolResults.forEach((result, idx) => {
    context += `工具${idx + 1}: ${result.tool}\n`;
    context += `参数: ${JSON.stringify(result.params)}\n`;
    context += `结果: ${JSON.stringify(result.result, null, 2)}\n\n`;
  });

  context += '请根据以上工具执行结果，给用户一个详细、专业的回复。';

  return context;
}

module.exports = fitnessAgentNode;
