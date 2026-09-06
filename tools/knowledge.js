// 知识检索工具（封装RAG功能）
const { hybridRetriever } = require('../rag');
const logger = require('../monitoring/logger');

class KnowledgeTool {
  constructor() {
    this.name = 'knowledge_retrieval';
    this.description = '从专业知识库中检索营养和运动相关知识';
  }

  /**
   * 执行知识检索
   */
  async execute(params) {
    const { query, category = null, top_k = 3 } = params;

    try {
      // 使用混合检索器
      const results = await hybridRetriever.retrieve(query, category);

      // 限制返回数量
      const limitedResults = results.slice(0, top_k);

      // 格式化结果
      const formattedResults = limitedResults.map((result, idx) => ({
        rank: idx + 1,
        content: result.content,
        source: result.metadata?.source || 'unknown',
        score: result.score,
        category: result.metadata?.category || category,
      }));

      logger.debug('知识检索成功', { query, category, resultsCount: formattedResults.length });

      return {
        success: true,
        data: {
          query,
          category,
          results_count: formattedResults.length,
          results: formattedResults,
          summary: this._generateSummary(formattedResults),
        },
      };

    } catch (error) {
      logger.error('知识检索失败', { error: error.message, params });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 生成检索结果摘要
   */
  _generateSummary(results) {
    if (results.length === 0) {
      return '未找到相关知识';
    }

    // 提取前3个结果的简短摘要
    const summaries = results.slice(0, 3).map(r => {
      const content = r.content;
      // 取前100个字符作为摘要
      return content.length > 100 ? content.substring(0, 100) + '...' : content;
    });

    return summaries.join('\n\n');
  }

  /**
   * 格式化为上下文字符串（供Agent使用）
   */
  formatAsContext(results) {
    if (!results || results.length === 0) {
      return '没有找到相关知识。';
    }

    let context = '【检索到的专业知识】\n\n';

    results.forEach((result, idx) => {
      context += `知识片段${idx + 1}：\n${result.content}\n\n`;
    });

    return context;
  }
}

// 单例
const knowledgeTool = new KnowledgeTool();

module.exports = knowledgeTool;
