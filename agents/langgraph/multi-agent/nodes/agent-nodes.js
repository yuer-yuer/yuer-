/**
 * Agent节点 - 包装SubGraph
 */

const { createNutritionSubGraph } = require('../subgraphs/nutrition-subgraph');
const { createFitnessSubGraph } = require('../subgraphs/fitness-subgraph');
const { createToolSubGraph } = require('../subgraphs/tool-subgraph');
const { createGeneralSubGraph } = require('../subgraphs/general-subgraph');
const logger = require('../../../../utils/logger');

/**
 * Nutrition Agent节点
 */
async function nutrition_agent_node(state) {
  try {
    logger.info('进入Nutrition Agent');

    const nutritionGraph = createNutritionSubGraph();

    const result = await nutritionGraph.invoke({
      input: {
        userQuery: state.userQuery,
        sharedContext: state.sharedContext
      }
    });

    logger.info('Nutrition Agent完成');

    return {
      agentResults: {
        ...state.agentResults,
        nutrition: result.response
      },
      messages: state.messages.concat([
        { role: 'assistant', agent: 'nutrition', content: result.response }
      ]),
      executionFlow: state.executionFlow.concat(['nutrition_agent'])
    };
  } catch (error) {
    logger.error('Nutrition Agent失败', { error: error.message });
    return {
      agentResults: {
        ...state.agentResults,
        nutrition: '营养分析服务暂时不可用'
      },
      executionFlow: state.executionFlow.concat(['nutrition_agent(error)'])
    };
  }
}

/**
 * Fitness Agent节点
 */
async function fitness_agent_node(state) {
  try {
    logger.info('进入Fitness Agent');

    const fitnessGraph = createFitnessSubGraph();

    const result = await fitnessGraph.invoke({
      input: {
        userQuery: state.userQuery,
        sharedContext: state.sharedContext
      }
    });

    logger.info('Fitness Agent完成');

    return {
      agentResults: {
        ...state.agentResults,
        fitness: result.response
      },
      messages: state.messages.concat([
        { role: 'assistant', agent: 'fitness', content: result.response }
      ]),
      executionFlow: state.executionFlow.concat(['fitness_agent'])
    };
  } catch (error) {
    logger.error('Fitness Agent失败', { error: error.message });
    return {
      agentResults: {
        ...state.agentResults,
        fitness: '运动指导服务暂时不可用'
      },
      executionFlow: state.executionFlow.concat(['fitness_agent(error)'])
    };
  }
}

/**
 * Tool Agent节点
 */
async function tool_agent_node(state) {
  try {
    logger.info('进入Tool Agent');

    const toolGraph = createToolSubGraph();

    const result = await toolGraph.invoke({
      input: {
        userQuery: state.userQuery,
        sharedContext: state.sharedContext
      }
    });

    logger.info('Tool Agent完成', { hasResults: !!result.toolResults });

    // Tool的结果放入sharedContext供其他Agent使用
    return {
      agentResults: {
        ...state.agentResults,
        tool: result.response
      },
      sharedContext: {
        ...state.sharedContext,
        toolData: result.toolResults // 其他Agent可以访问
      },
      messages: state.messages.concat([
        { role: 'assistant', agent: 'tool', content: result.response }
      ]),
      executionFlow: state.executionFlow.concat(['tool_agent'])
    };
  } catch (error) {
    logger.error('Tool Agent失败', { error: error.message });
    return {
      agentResults: {
        ...state.agentResults,
        tool: '数据操作服务暂时不可用'
      },
      executionFlow: state.executionFlow.concat(['tool_agent(error)'])
    };
  }
}

/**
 * General Agent节点
 */
async function general_agent_node(state) {
  try {
    logger.info('进入General Agent');

    const generalGraph = createGeneralSubGraph();

    const result = await generalGraph.invoke({
      input: {
        userQuery: state.userQuery,
        sharedContext: state.sharedContext
      }
    });

    logger.info('General Agent完成');

    return {
      agentResults: {
        ...state.agentResults,
        general: result.response
      },
      messages: state.messages.concat([
        { role: 'assistant', agent: 'general', content: result.response }
      ]),
      executionFlow: state.executionFlow.concat(['general_agent'])
    };
  } catch (error) {
    logger.error('General Agent失败', { error: error.message });
    return {
      agentResults: {
        ...state.agentResults,
        general: '通用对话服务暂时不可用'
      },
      executionFlow: state.executionFlow.concat(['general_agent(error)'])
    };
  }
}

module.exports = {
  nutrition_agent_node,
  fitness_agent_node,
  tool_agent_node,
  general_agent_node
};
