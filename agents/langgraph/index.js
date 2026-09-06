/**
 * LangGraph 入口文件
 */

const { createGraph } = require('./graph');

// 导出图实例
let graphInstance = null;

function getGraph() {
  if (!graphInstance) {
    graphInstance = createGraph();
  }
  return graphInstance;
}

module.exports = {
  getGraph,
};
