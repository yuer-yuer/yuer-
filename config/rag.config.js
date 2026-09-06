// RAG配置
module.exports = {
  // Qdrant向量数据库配置
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || undefined, // 云服务需要
    collectionName: 'manmanshou_knowledge',
    vectorSize: 1536, // 智谱embedding-2维度是1536
    distance: 'Cosine',
  },

  // Elasticsearch配置
  elasticsearch: {
    node: process.env.ES_NODE || 'http://localhost:9200',
    indexName: 'manmanshou_knowledge',
  },

  // Embedding配置
  embedding: {
    model: process.env.ZHIPU_EMBEDDING_MODEL || 'embedding-2',
    apiKey: process.env.ZHIPU_API_KEY,
    batchSize: 10, // 批量处理
    cacheTTL: 604800, // 缓存7天（秒）
  },

  // 检索配置
  retrieval: {
    topK: parseInt(process.env.RAG_TOP_K) || 5,
    scoreThreshold: parseFloat(process.env.RAG_SCORE_THRESHOLD) || 0.7,
    rerankerTopK: parseInt(process.env.RERANKER_TOP_K) || 3,

    // 混合检索权重
    hybridWeights: {
      vector: 0.6, // Qdrant向量检索权重
      keyword: 0.4, // ES关键词检索权重
    },
  },

  // Reranker配置
  reranker: {
    method: 'cosine', // 'cosine' 或 'cross-encoder'（如果使用BGE模型）
    scoreThreshold: 0.5,
  },
};
