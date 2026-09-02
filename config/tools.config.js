// Tool配置
module.exports = {
  // 食物数据库查询工具
  foodQuery: {
    enabled: true,
    dbPath: './data/database.sqlite',
    timeout: 5000, // 5秒超时
  },

  // C++计算引擎工具
  calcEngine: {
    enabled: true,
    enginePath: './cpp_engine/cpp_engine.exe',
    timeout: 3000,
  },

  // 历史数据分析工具
  historyAnalyzer: {
    enabled: true,
    dbPath: './data/database.sqlite',
    daysRange: 30, // 分析最近30天数据
  },

  // 饮食方案生成工具
  mealPlanner: {
    enabled: true,
    model: 'glm-4-flash',
    temperature: 0.8,
  },

  // RAG检索工具
  knowledgeRetrieval: {
    enabled: true,
    // 其他配置从rag.config.js继承
  },
};
