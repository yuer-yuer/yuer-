/**
 * Multi-Agent主图 - LangGraph智能路由
 */

const { StateGraph, END } = require('@langchain/langgraph');
const { MultiAgentState } = require('./state');
const { router_node } = require('./nodes/router-node');
const {
  nutrition_agent_node,
  fitness_agent_node,
  tool_agent_node
} = require('./nodes/agent-nodes');
const { aggregator_node } = require('./nodes/aggregator-node');
const logger = require('../../../utils/logger');

/**
 * 创建Multi-Agent主图
 */
function createMultiAgentGraph() {
  const workflow = new StateGraph(MultiAgentState);

  // 添加所有节点
  workflow.addNode('router', router_node);
  workflow.addNode('nutrition_agent', nutrition_agent_node);
  workflow.addNode('fitness_agent', fitness_agent_node);
  workflow.addNode('tool_agent', tool_agent_node);
  workflow.addNode('aggregator', aggregator_node);

  // 设置入口点
  workflow.setEntryPoint('router');

  // 🧠 智能路由 - 基于LLM决策动态选择Agent
  workflow.addConditionalEdges(
    'router',
    (state) => {
      const { agents, mode } = state.routingDecision;

      logger.info('路由条件边: 决策', { agents, mode });

      // single模式 - 直接路由到对应Agent
      if (mode === 'single') {
        return agents[0]; // 'nutrition_agent' / 'fitness_agent' / 'tool_agent'
      }

      // sequential模式 - 路由到第一个Agent
      if (mode === 'sequential') {
        return agents[0];
      }

      // parallel模式暂不支持，降级为sequential
      if (mode === 'parallel') {
        logger.warn('parallel模式暂不支持，降级为sequential');
        return agents[0];
      }

      // 默认
      return 'nutrition_agent';
    }
  );

  // sequential模式 - 第二步路由
  workflow.addConditionalEdges(
    'tool_agent',
    (state) => {
      const { agents, mode } = state.routingDecision;

      // 如果是sequential且Tool是第一个，路由到第二个Agent
      if (mode === 'sequential' && agents[0] === 'tool_agent' && agents.length > 1) {
        logger.info('Sequential第二步: 路由到', agents[1]);
        return agents[1]; // 'nutrition_agent' / 'fitness_agent'
      }

      // 否则直接汇总
      return 'aggregator';
    }
  );

  // 所有Agent完成后都到汇总节点
  workflow.addEdge('nutrition_agent', 'aggregator');
  workflow.addEdge('fitness_agent', 'aggregator');

  // 汇总后结束
  workflow.addEdge('aggregator', END);

  logger.info('Multi-Agent图创建完成');

  return workflow.compile();
}

module.exports = { createMultiAgentGraph };
