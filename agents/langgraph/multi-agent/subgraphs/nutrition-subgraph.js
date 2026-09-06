/**
 * Nutrition Agent SubGraph - ReAct模式
 */

const { StateGraph, END } = require('@langchain/langgraph');
const { Annotation } = require('@langchain/langgraph');
const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { hybridRetriever } = require('../../../../rag');
const nutritionPrompt = require('../../../prompts/nutrition');
const logger = require('../../../../utils/logger');

/**
 * Nutrition Agent的内部状态 - ReAct模式
 */
const NutritionState = Annotation.Root({
  input: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ({})
  }),

  // ReAct核心字段
  iterations: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => 0
  }),
  knowledgeBase: Annotation({
    reducer: (x, y) => [...(x || []), ...(Array.isArray(y) ? y : [y])],
    default: () => []
  }),
  thoughts: Annotation({
    reducer: (x, y) => [...(x || []), ...(Array.isArray(y) ? y : [y])],
    default: () => []
  }),

  isDone: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => false
  }),

  ragResults: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => []
  }),
  response: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ''
  })
});

// Nutrition Agent的LLM
const nutritionLLM = new ChatOpenAI({
  configuration: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
  apiKey: process.env.DASHSCOPE_API_KEY,
  model: 'qwen-plus',
  temperature: 0.7,
});

/**
 * ReAct思考节点：决定是否需要更多知识
 */
async function react_thought_node(state) {
  const { input, iterations, knowledgeBase, thoughts } = state;
  const { userQuery, sharedContext } = input;

  logger.info('Nutrition ReAct Thought节点', { iteration: iterations });

  // 构建当前知识摘要
  let knowledgeSummary = '';
  if (knowledgeBase.length > 0) {
    knowledgeSummary = '\n当前已检索的知识:\n';
    knowledgeBase.forEach((kb, i) => {
      knowledgeSummary += `\n检索${i + 1}: ${kb.query}\n`;
      knowledgeSummary += `结果数量: ${kb.results.length}条\n`;
      if (kb.results.length > 0) {
        knowledgeSummary += `摘要: ${kb.results[0].content.substring(0, 100)}...\n`;
      }
    });
  }

  // 用户数据上下文
  let userData = '';
  if (sharedContext && sharedContext.toolData) {
    userData = `\n用户数据:\n${JSON.stringify(sharedContext.toolData, null, 2)}\n`;
  }

  const systemPrompt = `你是营养专家助手，使用ReAct模式推理。

当前任务: ${userQuery}
${knowledgeSummary}
${userData}

ReAct推理格式:

如果当前知识不足，需要检索更多知识，返回:
Thought: [分析：为什么需要更多知识，缺少什么]
Action: retrieve_knowledge
Action Input: {"query": "需要检索的具体问题"}

如果知识充足，可以回答用户，返回:
Thought: [分析：当前知识已足够]
Final Answer: [营养专业的回答]

重要规则:
1. 每次只检索一个关键问题
2. 最多检索3次
3. 基于已有知识和用户数据给出专业建议

现在请思考:`;

  try {
    const response = await nutritionLLM.invoke([
      new SystemMessage(systemPrompt)
    ]);

    const content = response.content;

    // 解析Thought
    const thoughtMatch = content.match(/Thought:\s*(.+?)(?=\nAction|\nFinal Answer|$)/s);
    const thought = thoughtMatch ? thoughtMatch[1].trim() : content;

    // 检查是否完成
    if (content.includes('Final Answer:')) {
      const answerMatch = content.match(/Final Answer:\s*(.+)/s);
      const answer = answerMatch ? answerMatch[1].trim() : content;

      logger.info('Nutrition ReAct完成', { iterations: iterations + 1 });

      return {
        thoughts: [thought],
        isDone: true,
        response: answer,
        iterations: iterations + 1
      };
    }

    // 解析Action
    const actionInputMatch = content.match(/Action Input:\s*(\{.+?\})/s);

    if (!actionInputMatch) {
      logger.warn('Nutrition ReAct无法解析Action Input，直接完成');
      // 如果有知识，就用现有知识回答
      if (knowledgeBase.length > 0) {
        return {
          thoughts: [thought],
          isDone: true,
          iterations: iterations + 1
        };
      } else {
        return {
          thoughts: [thought],
          isDone: true,
          response: '根据您的问题，我需要更多信息才能给出专业建议。',
          iterations: iterations + 1
        };
      }
    }

    let actionInput = {};
    try {
      actionInput = JSON.parse(actionInputMatch[1]);
    } catch (e) {
      logger.error('解析Action Input失败', { input: actionInputMatch[1] });
    }

    logger.info('Nutrition ReAct解析Action', { query: actionInput.query });

    return {
      thoughts: [thought],
      ragQuery: actionInput.query,
      iterations: iterations + 1
    };

  } catch (error) {
    logger.error('Nutrition ReAct Thought失败', { error: error.message });
    return {
      isDone: true,
      response: '抱歉，分析过程出错。',
      iterations: iterations + 1
    };
  }
}

/**
 * ReAct检索节点：执行RAG检索
 */
async function react_retrieve_node(state) {
  const { ragQuery } = state;

  if (!ragQuery) {
    return { knowledgeBase: [] };
  }

  logger.info('Nutrition ReAct Retrieve节点', { query: ragQuery });

  try {
    const results = await hybridRetriever.retrieve(ragQuery, 'nutrition');

    logger.info('Nutrition ReAct检索完成', { count: results.length });

    return {
      knowledgeBase: [{
        query: ragQuery,
        results: results
      }]
    };

  } catch (error) {
    logger.error('Nutrition ReAct检索失败', { error: error.message });
    return { knowledgeBase: [] };
  }
}

/**
 * 最终推理节点：基于所有知识生成回答
 */
async function final_reasoning_node(state) {
  const { input, knowledgeBase } = state;
  const { userQuery, sharedContext } = input;

  logger.info('Nutrition最终推理节点');

  try {
    // 构建知识上下文
    let knowledge = '';
    if (knowledgeBase && knowledgeBase.length > 0) {
      const allResults = knowledgeBase.flatMap(kb => kb.results);
      knowledge = allResults.map((r, i) => `[${i + 1}] ${r.content}`).join('\n\n');
    }

    if (!knowledge) {
      knowledge = '暂无相关知识库内容';
    }

    // 如果有Tool Agent的数据，也加入上下文
    if (sharedContext && sharedContext.toolData) {
      knowledge += `\n\n【用户数据】\n${JSON.stringify(sharedContext.toolData, null, 2)}`;
    }

    // 替换knowledge占位符
    const systemPrompt = nutritionPrompt.replace('{knowledge}', knowledge);

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userQuery)
    ];

    const response = await nutritionLLM.invoke(messages);

    logger.info('Nutrition最终推理完成');

    return { response: response.content };

  } catch (error) {
    logger.error('Nutrition最终推理失败', { error: error.message });
    return { response: '抱歉，生成营养建议时出现错误。' };
  }
}

/**
 * 条件判断：是否继续循环
 */
function shouldContinue(state) {
  const { isDone, iterations } = state;

  if (isDone) {
    // 如果有知识需要最终推理
    if (state.knowledgeBase && state.knowledgeBase.length > 0 && !state.response) {
      logger.info('Nutrition ReAct转到最终推理');
      return 'final_reasoning';
    }
    logger.info('Nutrition ReAct结束', { reason: 'isDone', iterations });
    return END;
  }

  if (iterations >= 3) {
    logger.info('Nutrition ReAct达到最大迭代', { iterations });
    return 'final_reasoning';
  }

  return 'retrieve';
}

/**
 * 创建Nutrition ReAct SubGraph
 */
function createNutritionSubGraph() {
  const workflow = new StateGraph(NutritionState);

  // 添加节点
  workflow.addNode('thought', react_thought_node);
  workflow.addNode('retrieve', react_retrieve_node);
  workflow.addNode('final_reasoning', final_reasoning_node);

  // 入口
  workflow.setEntryPoint('thought');

  // 条件路由
  workflow.addConditionalEdges('thought', shouldContinue);

  // retrieve完成后回到thought（循环）
  workflow.addEdge('retrieve', 'thought');

  // final_reasoning完成后结束
  workflow.addEdge('final_reasoning', END);

  return workflow.compile();
}

module.exports = { createNutritionSubGraph };
