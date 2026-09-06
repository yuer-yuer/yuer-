/**
 * Multi-Agent系统入口
 */

const { createMultiAgentGraph } = require('./main-graph');
const logger = require('../../../utils/logger');

let graphInstance = null;

/**
 * 获取Multi-Agent图实例（单例）
 */
function getMultiAgentGraph() {
  if (!graphInstance) {
    logger.info('初始化Multi-Agent Graph');
    graphInstance = createMultiAgentGraph();
  }
  return graphInstance;
}

module.exports = {
  getMultiAgentGraph,
  createMultiAgentGraph
};
