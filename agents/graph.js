// 简化的Agent Graph实现（不使用LangGraph）
const logger = require('../monitoring/logger');
const classifyIntentNode = require('./nodes/classifier');
const nutritionAgentNode = require('./nodes/nutrition');
const fitnessAgentNode = require('./nodes/fitness');
const generalReplyNode = require('./nodes/general');

/**
 * Agent Graph - 简化实现
 * 使用简单的路由逻辑替代LangGraph
 */
class AgentGraph {
  constructor() {
    this.nodes = {
      classifier: classifyIntentNode,
      nutrition: nutritionAgentNode,
      fitness: fitnessAgentNode,
      general: generalReplyNode,
    };
  }

  /**
   * 执行Agent流程
   */
  async invoke(input) {
    const startTime = Date.now();

    try {
      // 1. 初始化状态
      let state = {
        messages: [
          {
            role: 'user',
            content: input.message,
          },
        ],
        intent: null,
        userId: input.userId,
      };

      logger.info('Agent流程开始', { userId: input.userId, message: input.message });

      // 2. 意图分类
      state = await this.nodes.classifier(state);

      // 3. 根据意图路由到对应的Agent
      switch (state.intent) {
        case 'nutrition':
          state = await this.nodes.nutrition(state);
          break;
        case 'fitness':
          state = await this.nodes.fitness(state);
          break;
        case 'general':
        default:
          state = await this.nodes.general(state);
          break;
      }

      const duration = Date.now() - startTime;

      logger.info('Agent流程完成', {
        userId: input.userId,
        intent: state.intent,
        duration,
      });

      // 4. 返回结果
      const assistantMessage = state.messages[state.messages.length - 1];

      return {
        reply: assistantMessage.content,
        intent: state.intent,
        agent: assistantMessage.metadata?.agent || 'unknown',
        knowledgeUsed: assistantMessage.metadata?.knowledgeUsed || 0,
        duration,
        error: assistantMessage.metadata?.error || false,
      };
    } catch (error) {
      logger.error('Agent流程失败', { error: error.message, stack: error.stack });

      // 兜底回复
      return {
        reply: '抱歉，系统繁忙，请稍后再试😊',
        intent: 'error',
        agent: 'error',
        knowledgeUsed: 0,
        duration: Date.now() - startTime,
        error: true,
      };
    }
  }

  /**
   * 流式执行（暂未实现）
   */
  async stream(input) {
    // TODO: 实现流式输出
    return this.invoke(input);
  }
}

// 创建单例
const agentGraph = new AgentGraph();

module.exports = agentGraph;
