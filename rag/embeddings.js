// Embedding服务（智谱Embedding API）
const axios = require('axios');
const logger = require('../monitoring/logger');
const cacheManager = require('../monitoring/cache');
const ragConfig = require('../config/rag.config');

class EmbeddingService {
  constructor() {
    // 优先使用阿里云DashScope
    if (process.env.DASHSCOPE_API_KEY) {
      this.provider = 'dashscope';
      this.apiKey = process.env.DASHSCOPE_API_KEY;
      this.model = 'text-embedding-v2';
      this.baseURL = 'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding';
    } else {
      // 降级到智谱
      this.provider = 'zhipu';
      this.apiKey = ragConfig.embedding.apiKey;
      this.model = ragConfig.embedding.model;
      this.baseURL = 'https://open.bigmodel.cn/api/paas/v4/embeddings';
    }
    this.batchSize = ragConfig.embedding.batchSize;
    logger.info(`Embedding服务: ${this.provider}`);
  }

  /**
   * 生成单个文本的Embedding
   */
  async embed(text) {
    // 尝试从缓存获取
    const cached = await cacheManager.getEmbedding(text);
    if (cached) {
      logger.debug('Embedding缓存命中');
      return cached;
    }

    // 重试机制
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        let embedding;

        if (this.provider === 'dashscope') {
          // 阿里云DashScope API
          const response = await axios.post(
            this.baseURL,
            {
              model: this.model,
              input: {
                texts: [text],
              },
            },
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 30000,
            }
          );

          embedding = response.data.output.embeddings[0].embedding;
        } else {
          // 智谱API
          const response = await axios.post(
            this.baseURL,
            {
              model: this.model,
              input: text,
            },
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 30000,
            }
          );

          embedding = response.data.data[0].embedding;
        }

        // 缓存结果
        await cacheManager.setEmbedding(text, embedding);

        logger.debug('Embedding生成成功', { provider: this.provider, textLength: text.length });
        return embedding;
      } catch (error) {
        lastError = error;

        if (error.response && error.response.status === 429) {
          // 速率限制，等待后重试
          const waitTime = (4 - retries) * 5000; // 5秒, 10秒, 15秒
          logger.warn(`API速率限制，等待${waitTime/1000}秒后重试...`);
          await this._sleep(waitTime);
          retries--;
        } else {
          // 其他错误，直接抛出
          logger.error('Embedding生成失败', { error: error.message });
          throw error;
        }
      }
    }

    // 所有重试都失败
    logger.error('Embedding生成失败（重试耗尽）', { error: lastError.message });
    throw lastError;
  }

  /**
   * 延迟函数
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 批量生成Embedding
   */
  async embedBatch(texts) {
    const results = [];

    // 每个请求间隔2秒，避免速率限制
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];

      // 检查缓存
      const cached = await cacheManager.getEmbedding(text);
      if (cached) {
        results.push(cached);
        logger.debug(`使用缓存 [${i + 1}/${texts.length}]`);
      } else {
        // 调用API
        const embedding = await this.embed(text);
        results.push(embedding);

        console.log(`  进度: ${i + 1}/${texts.length}`);
      }

      // 每10个请求后暂停3秒，避免速率限制
      if ((i + 1) % 10 === 0 && i + 1 < texts.length) {
        logger.info(`已完成 ${i + 1}/${texts.length}，暂停3秒...`);
        await this._sleep(3000);
      }
    }

    return results;
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}

// 单例
const embeddingService = new EmbeddingService();

module.exports = embeddingService;
