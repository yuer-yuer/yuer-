// Qdrant客户端封装（支持云服务）
const { QdrantClient } = require('@qdrant/js-client-rest');
const logger = require('../monitoring/logger');
const ragConfig = require('../config/rag.config');

class QdrantService {
  constructor() {
    // 支持本地或云端Qdrant
    this.client = new QdrantClient({
      url: ragConfig.qdrant.url,
      apiKey: ragConfig.qdrant.apiKey, // 云服务需要
      checkCompatibility: false, // 禁用版本兼容性检查
    });

    this.collectionName = ragConfig.qdrant.collectionName;
    this.vectorSize = ragConfig.qdrant.vectorSize;
  }

  /**
   * 初始化集合
   */
  async ensureCollection() {
    try {
      // 检查集合是否存在
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        c => c.name === this.collectionName
      );

      if (!exists) {
        // 创建集合
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: ragConfig.qdrant.distance,
          },
        });
        logger.info(`Qdrant集合已创建: ${this.collectionName}`);
      } else {
        logger.info(`Qdrant集合已存在: ${this.collectionName}`);
      }

      return true;
    } catch (error) {
      logger.error('Qdrant集合初始化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 插入向量
   */
  async upsert(points) {
    try {
      // 格式化数据点
      const formattedPoints = points.map((point, idx) => ({
        id: point.id || `point_${idx}`,
        vector: point.vector,
        payload: point.metadata || {},
      }));

      await this.client.upsert(this.collectionName, {
        points: formattedPoints,
      });

      logger.info(`已插入 ${points.length} 个向量到Qdrant`);
      return true;
    } catch (error) {
      logger.error('向量插入失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 向量检索
   */
  async search(vector, topK = 5, filter = null) {
    try {
      const startTime = Date.now();

      // 使用新版API的query方法
      const searchParams = {
        query: vector,
        limit: topK,
        with_payload: true,
      };

      if (filter) {
        searchParams.filter = filter;
      }

      const results = await this.client.query(this.collectionName, searchParams);

      const duration = Date.now() - startTime;
      logger.debug('Qdrant检索完成', { topK, resultsCount: results.points.length, duration });

      return results.points.map(result => ({
        id: result.id,
        score: result.score,
        content: result.payload?.content || '',
        metadata: result.payload || {},
      }));
    } catch (error) {
      logger.error('向量检索失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 删除集合
   */
  async deleteCollection() {
    try {
      await this.client.deleteCollection(this.collectionName);
      logger.info(`Qdrant集合已删除: ${this.collectionName}`);
      return true;
    } catch (error) {
      logger.error('删除集合失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取集合信息
   */
  async getCollectionInfo() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return info;
    } catch (error) {
      logger.error('获取集合信息失败', { error: error.message });
      return null;
    }
  }
}

// 单例
const qdrantService = new QdrantService();

module.exports = qdrantService;
