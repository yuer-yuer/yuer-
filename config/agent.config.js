// Agent配置
module.exports = {
  // LangGraph配置
  graph: {
    checkpointer: null, // 可选：添加状态持久化
    recursionLimit: 10,
  },

  // 意图分类配置
  classifier: {
    model: 'glm-4-flash',
    temperature: 0.1,
    maxTokens: 100,
  },

  // Agent配置
  agents: {
    nutrition: {
      model: 'glm-4-flash',
      temperature: 0.7,
      maxTokens: 1000,
    },
    fitness: {
      model: 'glm-4-flash',
      temperature: 0.7,
      maxTokens: 1000,
    },
    general: {
      model: 'glm-4-flash',
      temperature: 0.8,
      maxTokens: 800,
    },
  },
};
