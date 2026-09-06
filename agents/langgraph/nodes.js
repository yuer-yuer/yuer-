/**
 * LangGraph 节点定义
 */

const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage, AIMessage, ToolMessage } = require('@langchain/core/messages');
const routerPrompt = require('../prompts/router');
const nutritionPrompt = require('../prompts/nutrition');
const fitnessPrompt = require('../prompts/fitness');
const generalPrompt = require('../prompts/general');
const { hybridRetriever } = require('../../rag');
const logger = require('../../utils/logger');
const { TOOLS_SCHEMA } = require('./tools-schema');
const { executeTool } = require('./tools-handlers');

// 初始化LLM（通义千问）
const llm = new ChatOpenAI({
  configuration: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
  apiKey: process.env.DASHSCOPE_API_KEY,
  model: 'qwen-plus',
  temperature: 0.7,
  streaming: false,
});

// 初始化带工具调用的LLM
const llmWithTools = new ChatOpenAI({
  configuration: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
  apiKey: process.env.DASHSCOPE_API_KEY,
  model: 'qwen-plus',
  temperature: 0.7,
  streaming: false,
}).bind({ tools: TOOLS_SCHEMA });

/**
 * 路由节点 - 识别用户意图
 */
async function router_node(state) {
  const { userQuery } = state;

  try {
    logger.info('Router节点: 识别用户意图', { userQuery });

    const messages = [
      new SystemMessage(routerPrompt.system),
      new HumanMessage(userQuery),
    ];

    const response = await llm.invoke(messages);
    const intent = response.content.trim().toLowerCase();

    // 验证意图
    const validIntents = ['nutrition', 'fitness', 'general'];
    const finalIntent = validIntents.includes(intent) ? intent : 'general';

    logger.info('意图识别完成', { intent: finalIntent });

    return {
      intent: finalIntent,
      messages: state.messages.concat([
        { role: 'user', content: userQuery },
      ]),
    };
  } catch (error) {
    logger.error('Router节点失败', { error: error.message });
    return { intent: 'general' };
  }
}

/**
 * RAG检索节点
 */
async function rag_node(state) {
  const { userQuery, intent } = state;

  try {
    logger.info('RAG节点: 开始检索', { userQuery, intent });

    // 调用混合检索
    const results = await hybridRetriever.search(userQuery, {
      category: intent === 'nutrition' ? 'nutrition' : 'fitness',
      topK: 5,
    });

    logger.info('RAG检索完成', { resultsCount: results.length });

    return {
      ragResults: results,
    };
  } catch (error) {
    logger.error('RAG节点失败', { error: error.message });
    return { ragResults: [] };
  }
}

/**
 * 营养咨询节点
 */
async function nutrition_node(state) {
  const { userQuery, ragResults } = state;

  try {
    logger.info('Nutrition节点: 生成回复');

    // 构建上下文
    const context = ragResults && ragResults.length > 0
      ? ragResults.map((r, i) => `[${i + 1}] ${r.content}`).join('\n\n')
      : '暂无相关知识库内容';

    const prompt = nutritionPrompt.user
      .replace('{context}', context)
      .replace('{query}', userQuery);

    const messages = [
      new SystemMessage(nutritionPrompt.system),
      new HumanMessage(prompt),
    ];

    const response = await llm.invoke(messages);
    const answer = response.content;

    logger.info('Nutrition节点完成');

    return {
      response: answer,
      messages: state.messages.concat([
        { role: 'assistant', content: answer },
      ]),
    };
  } catch (error) {
    logger.error('Nutrition节点失败', { error: error.message });
    return { response: '抱歉，生成营养建议时出现错误，请稍后再试。' };
  }
}

/**
 * 运动指导节点
 */
async function fitness_node(state) {
  const { userQuery, ragResults } = state;

  try {
    logger.info('Fitness节点: 生成回复');

    const context = ragResults && ragResults.length > 0
      ? ragResults.map((r, i) => `[${i + 1}] ${r.content}`).join('\n\n')
      : '暂无相关知识库内容';

    const prompt = fitnessPrompt.user
      .replace('{context}', context)
      .replace('{query}', userQuery);

    const messages = [
      new SystemMessage(fitnessPrompt.system),
      new HumanMessage(prompt),
    ];

    const response = await llm.invoke(messages);
    const answer = response.content;

    logger.info('Fitness节点完成');

    return {
      response: answer,
      messages: state.messages.concat([
        { role: 'assistant', content: answer },
      ]),
    };
  } catch (error) {
    logger.error('Fitness节点失败', { error: error.message });
    return { response: '抱歉，生成运动建议时出现错误，请稍后再试。' };
  }
}

/**
 * 通用对话节点
 */
async function general_node(state) {
  const { userQuery } = state;

  try {
    logger.info('General节点: 生成回复');

    const messages = [
      new SystemMessage(generalPrompt.system),
      new HumanMessage(userQuery),
    ];

    const response = await llm.invoke(messages);
    const answer = response.content;

    logger.info('General节点完成');

    return {
      response: answer,
      messages: state.messages.concat([
        { role: 'assistant', content: answer },
      ]),
    };
  } catch (error) {
    logger.error('General节点失败', { error: error.message });
    return { response: '你好！我是你的减肥健身助手，有什么可以帮到你的吗？' };
  }
}

/**
 * 工具调用节点 - 让LLM决定是否需要调用工具
 */
async function tool_calling_node(state) {
  const { userQuery, ragResults } = state;

  try {
    logger.info('ToolCalling节点: 分析是否需要工具调用');

    // 构建系统提示
    const systemPrompt = `你是一个智能健身助手，可以帮助用户记录饮食、运动、体重，并查询历史数据。

当用户需要记录数据或查询数据时，你应该调用相应的工具。

可用工具：
- log_meal: 记录饮食
- log_exercise: 记录运动
- log_weight: 记录体重
- query_today: 查询今日汇总
- query_history: 查询历史记录
- search_food_database: 搜索食物热量

注意：
1. 记录饮食时，如果用户没有提供热量，先调用 search_food_database 查询
2. 可以在一次对话中调用多个工具
3. 如果用户只是咨询问题，不需要调用工具`;

    // 构建上下文
    let contextText = '';
    if (ragResults && ragResults.length > 0) {
      contextText = '\n\n参考知识：\n' + ragResults
        .map((r, i) => `[${i + 1}] ${r.content}`)
        .join('\n\n');
    }

    const messages = [
      new SystemMessage(systemPrompt + contextText),
      new HumanMessage(userQuery),
    ];

    const response = await llmWithTools.invoke(messages);

    logger.info('工具调用分析完成', {
      hasToolCalls: !!response.tool_calls && response.tool_calls.length > 0,
      toolCount: response.tool_calls?.length || 0
    });

    return {
      toolCalls: response.tool_calls || [],
      llmResponse: response,
      metadata: {
        ...state.metadata,
        needsToolExecution: response.tool_calls && response.tool_calls.length > 0
      }
    };
  } catch (error) {
    logger.error('ToolCalling节点失败', { error: error.message });
    return {
      toolCalls: [],
      metadata: { ...state.metadata, needsToolExecution: false }
    };
  }
}

/**
 * 工具执行节点 - 实际执行工具调用
 */
async function tool_execution_node(state) {
  const { toolCalls } = state;

  if (!toolCalls || toolCalls.length === 0) {
    logger.info('无需执行工具');
    return { toolResults: [] };
  }

  try {
    logger.info('ToolExecution节点: 执行工具', { count: toolCalls.length });

    const results = [];
    const db = state.metadata.db;
    const userId = state.metadata.userId || 1; // 默认用户ID

    const context = { db, userId };

    for (const toolCall of toolCalls) {
      const { name, args, id } = toolCall;

      try {
        logger.info('执行工具', { tool: name, args });

        const result = await executeTool(name, args, context);

        results.push({
          tool_call_id: id,
          tool_name: name,
          result,
          success: true
        });

        logger.info('工具执行成功', { tool: name });
      } catch (error) {
        logger.error('工具执行失败', { tool: name, error: error.message });

        results.push({
          tool_call_id: id,
          tool_name: name,
          result: { success: false, error: error.message },
          success: false
        });
      }
    }

    return {
      toolResults: results,
      metadata: {
        ...state.metadata,
        toolExecutionComplete: true
      }
    };
  } catch (error) {
    logger.error('ToolExecution节点失败', { error: error.message });
    return { toolResults: [] };
  }
}

/**
 * 工具响应生成节点 - 基于工具执行结果生成最终回复
 */
async function tool_response_node(state) {
  const { userQuery, toolResults, llmResponse } = state;

  try {
    logger.info('ToolResponse节点: 生成最终回复');

    // 构建工具结果摘要
    const toolSummary = toolResults.map(tr => {
      if (tr.success) {
        return `工具 ${tr.tool_name} 执行成功:\n${JSON.stringify(tr.result, null, 2)}`;
      } else {
        return `工具 ${tr.tool_name} 执行失败: ${tr.result.error}`;
      }
    }).join('\n\n');

    const systemPrompt = `你是一个智能健身助手。工具已经执行完毕，请根据工具执行结果生成友好的回复给用户。

要求：
1. 用自然语言总结工具执行结果
2. 如果记录成功，确认具体记录了什么
3. 如果查询成功，清晰展示数据
4. 如果失败，友好地解释原因并建议下一步
5. 保持简洁友好的语气`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userQuery),
      new AIMessage({
        content: llmResponse?.content || '',
        tool_calls: llmResponse?.tool_calls || []
      }),
      new HumanMessage(`工具执行结果：\n${toolSummary}`)
    ];

    const response = await llm.invoke(messages);
    const answer = response.content;

    logger.info('ToolResponse节点完成');

    return {
      response: answer,
      messages: state.messages.concat([
        { role: 'assistant', content: answer },
      ]),
    };
  } catch (error) {
    logger.error('ToolResponse节点失败', { error: error.message });
    return { response: '工具执行完成，但生成回复时出现错误。' };
  }
}

module.exports = {
  router_node,
  rag_node,
  nutrition_node,
  fitness_node,
  general_node,
  tool_calling_node,
  tool_execution_node,
  tool_response_node,
};
