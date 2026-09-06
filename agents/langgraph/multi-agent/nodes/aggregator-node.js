/**
 * 结果汇总节点
 */

const logger = require('../../../../utils/logger');

/**
 * 汇总节点 - 整合多个Agent的结果
 */
async function aggregator_node(state) {
  const { routingDecision, agentResults } = state;

  try {
    logger.info('汇总节点: 整合结果', {
      mode: routingDecision.mode,
      agents: routingDecision.agents
    });

    // 如果只有一个Agent，直接返回
    if (routingDecision.agents.length === 1) {
      const agentName = routingDecision.agents[0].replace('_agent', '');
      const response = agentResults[agentName] || '处理完成';

      return {
        finalResponse: response,
        executionFlow: state.executionFlow.concat(['aggregator(single)'])
      };
    }

    // 多个Agent，汇总结果
    let finalResponse = '';
    const parts = [];

    // Tool Agent的结果
    if (agentResults.tool) {
      parts.push(agentResults.tool);
    }

    // Nutrition Agent的结果
    if (agentResults.nutrition) {
      if (parts.length > 0) {
        parts.push('\n📊 **营养分析**');
      }
      parts.push(agentResults.nutrition);
    }

    // Fitness Agent的结果
    if (agentResults.fitness) {
      if (parts.length > 0) {
        parts.push('\n💪 **运动建议**');
      }
      parts.push(agentResults.fitness);
    }

    finalResponse = parts.join('\n\n');

    logger.info('汇总完成', { responseLength: finalResponse.length });

    return {
      finalResponse: finalResponse.trim() || '处理完成',
      executionFlow: state.executionFlow.concat(['aggregator(multi)'])
    };
  } catch (error) {
    logger.error('汇总节点失败', { error: error.message });

    // 降级：返回任何可用的结果
    const fallback = agentResults.tool || agentResults.nutrition || agentResults.fitness || '处理出现错误';

    return {
      finalResponse: fallback,
      executionFlow: state.executionFlow.concat(['aggregator(error)'])
    };
  }
}

module.exports = { aggregator_node };
