// Tools统一导出
const knowledgeTool = require('./knowledge');
const calculatorTool = require('./calculator');
const foodTool = require('./food');

// 工具注册表
const tools = {
  knowledge_retrieval: knowledgeTool,
  calc_engine: calculatorTool,
  food_query: foodTool,
};

/**
 * 执行工具调用
 */
async function executeTool(toolName, params) {
  const tool = tools[toolName];

  if (!tool) {
    return {
      success: false,
      error: `未知的工具: ${toolName}`,
    };
  }

  return await tool.execute(params);
}

/**
 * 获取所有可用工具
 */
function getAvailableTools() {
  return Object.keys(tools).map(name => ({
    name,
    description: tools[name].description,
  }));
}

/**
 * 获取特定Agent的工具集
 */
function getAgentTools(agentType) {
  const agentToolMap = {
    nutrition: ['knowledge_retrieval', 'calc_engine', 'food_query'],
    fitness: ['knowledge_retrieval', 'calc_engine'],
    general: ['knowledge_retrieval'],
  };

  const toolNames = agentToolMap[agentType] || [];
  return toolNames.map(name => ({
    name,
    description: tools[name].description,
  }));
}

module.exports = {
  tools,
  executeTool,
  getAvailableTools,
  getAgentTools,
  // 单独导出各工具
  knowledgeTool,
  calculatorTool,
  foodTool,
};
