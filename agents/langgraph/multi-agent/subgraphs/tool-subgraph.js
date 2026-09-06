/**
 * Tool Agent SubGraph - ReAct模式
 */

const { StateGraph, END } = require('@langchain/langgraph');
const { Annotation } = require('@langchain/langgraph');
const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
const { TOOLS_SCHEMA } = require('../../tools-schema');
const { executeTool } = require('../../tools-handlers');
const logger = require('../../../../utils/logger');

/**
 * Tool Agent的内部状态 - ReAct模式
 */
const ToolState = Annotation.Root({
  input: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ({})
  }),

  // ReAct核心字段
  iterations: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => 0
  }),
  thoughts: Annotation({
    reducer: (x, y) => [...(x || []), ...(Array.isArray(y) ? y : [y])],
    default: () => []
  }),
  actions: Annotation({
    reducer: (x, y) => [...(x || []), ...(Array.isArray(y) ? y : [y])],
    default: () => []
  }),
  observations: Annotation({
    reducer: (x, y) => [...(x || []), ...(Array.isArray(y) ? y : [y])],
    default: () => []
  }),

  isDone: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => false
  }),
  finalAnswer: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ''
  }),

  toolResults: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => []
  }),
  response: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ''
  })
});

// Tool Agent的LLM
const toolLLM = new ChatOpenAI({
  configuration: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
  apiKey: process.env.DASHSCOPE_API_KEY,
  model: 'qwen-plus',
  temperature: 0.7,
});

/**
 * ReAct思考节点：LLM决定下一步
 */
async function react_thought_node(state) {
  const { input, iterations, thoughts, observations } = state;
  const { userQuery } = input;

  logger.info('Tool ReAct Thought节点', { iteration: iterations });

  // 构建历史
  let history = '';

  if (observations.length > 0) {
    history += '\n已执行的操作和结果:\n';
    for (let i = 0; i < observations.length; i++) {
      history += `\n第${i + 1}步:\n`;
      history += `Thought: ${thoughts[i]}\n`;
      history += `Action: ${observations[i].action}\n`;
      history += `Observation: ${JSON.stringify(observations[i].result, null, 2)}\n`;
    }
  }

  const systemPrompt = `你是智能工具调度助手，使用ReAct模式推理。

可用工具:
- log_meal: 记录饮食（参数: meal_name, weight_g, calories）
- log_exercise: 记录运动（参数: exercise_name, duration_minutes, calories_burned）
- log_weight: 记录体重（参数: weight_kg）
- query_today: 查询今日汇总（无参数）
- query_history: 查询历史（参数: days）
- search_food_database: 搜索食物数据库（参数: food_name）

ReAct推理格式:

如果需要更多信息或执行操作，返回:
Thought: [你的分析思考]
Action: tool_name
Action Input: {"param": "value"}

如果任务完成，返回:
Thought: [最终总结]
Final Answer: [给用户的友好回复]

重要规则:
1. 如果用户记录食物但没说重量/热量，先调用search_food_database查询
2. 每次只执行一个工具
3. 基于工具结果决定是否需要继续
4. 最多3次迭代

用户请求: ${userQuery}
${history}

现在请思考下一步:`;

  try {
    const response = await toolLLM.invoke([
      new SystemMessage(systemPrompt)
    ]);

    const content = response.content;

    // 解析LLM输出
    const thoughtMatch = content.match(/Thought:\s*(.+?)(?=\nAction|\nFinal Answer|$)/s);
    const thought = thoughtMatch ? thoughtMatch[1].trim() : content;

    // 检查是否完成
    if (content.includes('Final Answer:')) {
      const answerMatch = content.match(/Final Answer:\s*(.+)/s);
      const answer = answerMatch ? answerMatch[1].trim() : content;

      logger.info('Tool ReAct完成', { iterations: iterations + 1 });

      return {
        thoughts: [thought],
        isDone: true,
        finalAnswer: answer,
        response: answer,
        iterations: iterations + 1
      };
    }

    // 解析Action
    const actionMatch = content.match(/Action:\s*(.+?)(?=\n|$)/);
    const actionInputMatch = content.match(/Action Input:\s*(\{.+?\})/s);

    if (!actionMatch) {
      logger.warn('Tool ReAct无法解析Action', { content });
      return {
        isDone: true,
        finalAnswer: '已收到您的请求。',
        response: '已收到您的请求。',
        iterations: iterations + 1
      };
    }

    const action = actionMatch[1].trim();
    let actionInput = {};

    if (actionInputMatch) {
      try {
        actionInput = JSON.parse(actionInputMatch[1]);
      } catch (e) {
        logger.error('解析Action Input失败', { input: actionInputMatch[1] });
      }
    }

    logger.info('Tool ReAct解析Action', { action, actionInput });

    return {
      thoughts: [thought],
      actions: [{ name: action, args: actionInput }],
      iterations: iterations + 1
    };

  } catch (error) {
    logger.error('Tool ReAct Thought失败', { error: error.message });
    return {
      isDone: true,
      finalAnswer: '推理过程出错，请重试。',
      response: '推理过程出错，请重试。',
      iterations: iterations + 1
    };
  }
}

/**
 * ReAct执行节点：执行工具
 */
async function react_action_node(state) {
  const { input, actions, toolResults: existingResults } = state;
  const { sharedContext } = input;

  if (!actions || actions.length === 0) {
    return { observations: [] };
  }

  const lastAction = actions[actions.length - 1];

  logger.info('Tool ReAct Action节点', { action: lastAction.name, args: lastAction.args });

  try {
    const result = await executeTool(
      lastAction.name,
      lastAction.args,
      { db: sharedContext.db, userId: sharedContext.userId || 1 }
    );

    logger.info('Tool ReAct Action成功', { tool: lastAction.name });

    return {
      observations: [{
        action: lastAction.name,
        result: result
      }],
      toolResults: (existingResults || []).concat([{
        tool_name: lastAction.name,
        result: result,
        success: true
      }])
    };

  } catch (error) {
    logger.error('Tool ReAct Action失败', { error: error.message });

    return {
      observations: [{
        action: lastAction.name,
        result: { success: false, error: error.message }
      }],
      toolResults: (existingResults || []).concat([{
        tool_name: lastAction.name,
        result: { error: error.message },
        success: false
      }])
    };
  }
}

/**
 * 条件判断：是否继续循环
 */
function shouldContinue(state) {
  const { isDone, iterations } = state;

  if (isDone) {
    logger.info('Tool ReAct结束', { reason: 'isDone', iterations });
    return END;
  }

  if (iterations >= 3) {
    logger.info('Tool ReAct结束', { reason: 'maxIterations', iterations });
    return END;
  }

  return 'action';
}

/**
 * 创建Tool ReAct SubGraph
 */
function createToolSubGraph() {
  const workflow = new StateGraph(ToolState);

  // 添加节点
  workflow.addNode('thought', react_thought_node);
  workflow.addNode('action', react_action_node);

  // 入口
  workflow.setEntryPoint('thought');

  // 条件路由：thought后决定是否继续
  workflow.addConditionalEdges('thought', shouldContinue);

  // action完成后回到thought（循环）
  workflow.addEdge('action', 'thought');

  return workflow.compile();
}

module.exports = { createToolSubGraph };
