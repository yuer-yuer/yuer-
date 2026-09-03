// 混合检索策略
const logger = require('../monitoring/logger');
const metricsCollector = require('../monitoring/metrics');
const qdrantService = require('./qdrant');
const elasticsearchService = require('./elasticsearch');
const embeddingService = require('./embeddings');
const ragConfig = require('../config/rag.config');

class HybridRetriever {
  constructor() {
    this.topK = ragConfig.retrieval.topK;
    this.scoreThreshold = ragConfig.retrieval.scoreThreshold;
    this.hybridWeights = ragConfig.retrieval.hybridWeights;
  }

  /**
   * 混合检索
   */
  async retrieve(query, category = null) {
    const startTime = Date.now();

    try {
      // 1. 生成查询向量
      const queryVector = await embeddingService.embed(query);

      // 2. Qdrant向量检索（带降级）
      let vectorResults = [];
      try {
        vectorResults = await qdrantService.search(
          queryVector,
          this.topK * 2,
          category ? { must: [{ key: 'category', match: { value: category } }] } : null
        );
        logger.debug('向量检索成功', { count: vectorResults.length });
      } catch (error) {
        logger.warn('向量检索失败，使用纯关键词模式', { error: error.message });
      }

      // 3. Elasticsearch关键词检索
      const keywordResults = await elasticsearchService.search(
        query,
        this.topK * 2,
        category
      );

      // 4. 如果向量检索失败，直接返回关键词结果
      if (vectorResults.length === 0) {
        const topResults = keywordResults.slice(0, ragConfig.retrieval.rerankerTopK);
        const duration = Date.now() - startTime;
        logger.info('关键词检索完成（降级模式）', {
          query,
          category,
          resultsCount: topResults.length,
          duration,
        });
        metricsCollector.recordRAGQuery(topResults.length, duration);
        return topResults;
      }

      // 5. 融合结果
      const fusedResults = this._fuseResults(vectorResults, keywordResults);

      // 6. 重排序（基于余弦相似度）
      const rerankedResults = await this._rerank(query, queryVector, fusedResults);

      // 7. 过滤低分结果
      const filteredResults = rerankedResults.filter(
        r => r.score >= this.scoreThreshold
      ).slice(0, ragConfig.retrieval.rerankerTopK);

      const duration = Date.now() - startTime;
      logger.info('混合检索完成', {
        query,
        category,
        resultsCount: filteredResults.length,
        duration,
      });

      // 记录指标
      metricsCollector.recordRAGQuery(filteredResults.length, duration);

      return filteredResults;
    } catch (error) {
      logger.error('混合检索失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 融合向量和关键词检索结果
   */
  _fuseResults(vectorResults, keywordResults) {
    // 使用Map去重（基于id）
    const resultsMap = new Map();

    // 归一化分数
    const maxVectorScore = Math.max(...vectorResults.map(r => r.score), 1);
    const maxKeywordScore = Math.max(...keywordResults.map(r => r.score), 1);

    // 添加向量检索结果
    vectorResults.forEach(result => {
      const normalizedScore = result.score / maxVectorScore;
      resultsMap.set(result.id, {
        ...result,
        vectorScore: normalizedScore,
        keywordScore: 0,
        fusedScore: normalizedScore * this.hybridWeights.vector,
      });
    });

    // 添加或合并关键词检索结果
    keywordResults.forEach(result => {
      const normalizedScore = result.score / maxKeywordScore;

      if (resultsMap.has(result.id)) {
        // 合并分数
        const existing = resultsMap.get(result.id);
        existing.keywordScore = normalizedScore;
        existing.fusedScore =
          existing.vectorScore * this.hybridWeights.vector +
          normalizedScore * this.hybridWeights.keyword;
      } else {
        // 新增结果
        resultsMap.set(result.id, {
          ...result,
          vectorScore: 0,
          keywordScore: normalizedScore,
          fusedScore: normalizedScore * this.hybridWeights.keyword,
        });
      }
    });

    // 转换为数组并排序
    return Array.from(resultsMap.values())
      .sort((a, b) => b.fusedScore - a.fusedScore);
  }

  /**
   * 重排序（使用余弦相似度）
   */
  async _rerank(query, queryVector, results) {
    // 简单的Reranker：重新计算与查询的相似度
    const rerankedResults = [];

    for (const result of results) {
      // 重新生成内容的Embedding（如果需要）
      const contentVector = await embeddingService.embed(result.content.substring(0, 500));
      const similarity = embeddingService.cosineSimilarity(queryVector, contentVector);

      rerankedResults.push({
        ...result,
        score: similarity,
        originalScore: result.fusedScore,
      });
    }

    // 按新分数排序
    return rerankedResults.sort((a, b) => b.score - a.score);
  }

  /**
   * 格式化检索结果为上下文
   */
  formatContext(results) {
    if (results.length === 0) {
      return '没有找到相关知识。';
    }

    let context = '以下是相关知识：\n\n';

    results.forEach((result, idx) => {
      context += `【知识片段${idx + 1}】\n${result.content}\n\n`;
    });

    return context;
  }
}

// 单例
const hybridRetriever = new HybridRetriever();

module.exports = hybridRetriever;
