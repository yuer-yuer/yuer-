// Elasticsearch客户端封装（可选，支持本地搜索降级）
const { Client } = require('@elastic/elasticsearch');
const logger = require('../monitoring/logger');
const ragConfig = require('../config/rag.config');

class ElasticsearchService {
  constructor() {
    this.useES = false; // 默认不使用ES
    this.indexName = ragConfig.elasticsearch.indexName;
    this.documents = []; // 内存存储，用于降级方案

    try {
      // 尝试连接ES
      this.client = new Client({
        node: ragConfig.elasticsearch.node,
      });
      this.useES = true;
      logger.info('Elasticsearch客户端已初始化');
    } catch (error) {
      logger.warn('Elasticsearch未连接，使用内存搜索降级', { error: error.message });
    }
  }

  /**
   * 初始化索引
   */
  async ensureIndex() {
    if (!this.useES) {
      logger.info('使用内存搜索，跳过索引创建');
      return true;
    }

    try {
      const exists = await this.client.indices.exists({ index: this.indexName });

      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                content: {
                  type: 'text',
                  analyzer: 'ik_max_word', // 中文分词（需要安装ik插件）
                  search_analyzer: 'ik_smart',
                },
                category: { type: 'keyword' },
                source: { type: 'keyword' },
                chunk_index: { type: 'integer' },
              },
            },
          },
        });
        logger.info(`ES索引已创建: ${this.indexName}`);
      } else {
        logger.info(`ES索引已存在: ${this.indexName}`);
      }

      return true;
    } catch (error) {
      logger.error('ES索引初始化失败', { error: error.message });
      this.useES = false;
      return false;
    }
  }

  /**
   * 批量索引文档
   */
  async bulkIndex(documents) {
    // 保存到内存（降级方案）
    this.documents = documents;

    if (!this.useES) {
      logger.info(`已保存 ${documents.length} 个文档到内存`);
      return true;
    }

    try {
      const operations = documents.flatMap(doc => [
        { index: { _index: this.indexName, _id: doc.id } },
        {
          content: doc.content,
          category: doc.metadata.category,
          source: doc.metadata.source,
          chunk_index: doc.metadata.chunk_index,
        },
      ]);

      await this.client.bulk({ operations, refresh: true });
      logger.info(`已索引 ${documents.length} 个文档到ES`);
      return true;
    } catch (error) {
      logger.error('批量索引失败', { error: error.message });
      this.useES = false;
      return false;
    }
  }

  /**
   * 关键词检索
   */
  async search(query, topK = 5, category = null) {
    const startTime = Date.now();

    if (!this.useES) {
      // 降级到内存搜索
      return this._memorySearch(query, topK, category);
    }

    try {
      const mustClauses = [
        { match: { content: query } },
      ];

      if (category) {
        mustClauses.push({ term: { category } });
      }

      const result = await this.client.search({
        index: this.indexName,
        body: {
          query: {
            bool: { must: mustClauses },
          },
          size: topK,
        },
      });

      const duration = Date.now() - startTime;
      logger.debug('ES检索完成', { topK, resultsCount: result.hits.hits.length, duration });

      return result.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        content: hit._source.content,
        metadata: {
          category: hit._source.category,
          source: hit._source.source,
          chunk_index: hit._source.chunk_index,
        },
      }));
    } catch (error) {
      logger.error('ES检索失败，降级到内存搜索', { error: error.message });
      this.useES = false;
      return this._memorySearch(query, topK, category);
    }
  }

  /**
   * 内存搜索（简单关键词匹配）
   */
  _memorySearch(query, topK, category) {
    // 改进分词：支持中文单字分词
    const keywords = this._tokenize(query);

    let results = this.documents
      .filter(doc => {
        // 类别过滤
        if (category && doc.metadata.category !== category) {
          return false;
        }

        // 关键词匹配
        const content = doc.content.toLowerCase();
        return keywords.some(keyword => content.includes(keyword));
      })
      .map(doc => {
        // 计算匹配分数（改进算法）
        const content = doc.content.toLowerCase();
        let score = 0;

        keywords.forEach(keyword => {
          // 计算关键词出现次数
          const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
          // 长词权重更高
          const weight = keyword.length > 1 ? 2 : 1;
          score += matches * weight;
        });

        return {
          id: doc.id,
          score,
          content: doc.content,
          metadata: doc.metadata,
        };
      })
      .filter(doc => doc.score > 0) // 过滤无匹配的文档
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    logger.debug('内存搜索完成', {
      topK,
      keywords: keywords.join(','),
      resultsCount: results.length,
    });

    return results;
  }

  /**
   * 改进的中文分词
   */
  _tokenize(text) {
    const lower = text.toLowerCase();
    const tokens = [];

    // 提取英文词和数字
    const words = lower.match(/[a-z0-9]+/g) || [];
    tokens.push(...words);

    // 提取中文字符
    const chinese = lower.replace(/[^一-龥]/g, '');

    // 添加2-4字的中文词组
    for (let len = 4; len >= 2; len--) {
      for (let i = 0; i <= chinese.length - len; i++) {
        tokens.push(chinese.substring(i, i + len));
      }
    }

    // 添加单个中文字
    for (let i = 0; i < chinese.length; i++) {
      tokens.push(chinese[i]);
    }

    // 去重
    return [...new Set(tokens)];
  }

  /**
   * 删除索引
   */
  async deleteIndex() {
    if (!this.useES) {
      this.documents = [];
      logger.info('内存数据已清空');
      return true;
    }

    try {
      await this.client.indices.delete({ index: this.indexName });
      logger.info(`ES索引已删除: ${this.indexName}`);
      return true;
    } catch (error) {
      logger.error('删除索引失败', { error: error.message });
      return false;
    }
  }
}

// 单例
const elasticsearchService = new ElasticsearchService();

module.exports = elasticsearchService;
