// 缓存管理
const Redis = require('ioredis');
const logger = require('./logger');

class CacheManager {
  constructor() {
    this.useRedis = false;
    this.memoryCache = new Map(); // 内存缓存降级方案
    this.defaultTTL = parseInt(process.env.CACHE_TTL) || 86400; // 24小时

    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.warn('Redis连接失败，使用内存缓存');
            this.useRedis = false;
            return null; // 停止重试
          }
          return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: 3,
      });

      this.redis.on('error', (err) => {
        this.useRedis = false;
        // 只记录第一次错误
        if (!this._errorLogged) {
          logger.warn('Redis不可用，已切换到内存缓存', { error: err.message });
          this._errorLogged = true;
        }
      });

      this.redis.on('connect', () => {
        this.useRedis = true;
        logger.info('Redis连接成功');
      });
    } catch (error) {
      this.useRedis = false;
      logger.warn('Redis初始化失败，使用内存缓存', { error: error.message });
    }
  }

  /**
   * 生成缓存键
   */
  generateKey(prefix, ...parts) {
    return `manmanshou:${prefix}:${parts.join(':')}`;
  }

  /**
   * 获取缓存
   */
  async get(key) {
    if (!this.useRedis) {
      // 使用内存缓存
      const cached = this.memoryCache.get(key);
      if (cached && cached.expireAt > Date.now()) {
        logger.debug('内存缓存命中', { key });
        return cached.value;
      }
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (value) {
        logger.debug('缓存命中', { key });
        return JSON.parse(value);
      }
      logger.debug('缓存未命中', { key });
      return null;
    } catch (error) {
      logger.error('获取缓存失败', { key, error: error.message });
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.useRedis) {
      // 使用内存缓存
      this.memoryCache.set(key, {
        value,
        expireAt: Date.now() + ttl * 1000,
      });
      logger.debug('内存缓存已设置', { key, ttl });
      return true;
    }

    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      logger.debug('缓存已设置', { key, ttl });
      return true;
    } catch (error) {
      logger.error('设置缓存失败', { key, error: error.message });
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async del(key) {
    try {
      await this.redis.del(key);
      logger.debug('缓存已删除', { key });
      return true;
    } catch (error) {
      logger.error('删除缓存失败', { key, error: error.message });
      return false;
    }
  }

  /**
   * LLM响应缓存
   */
  async getLLMResponse(prompt) {
    const key = this.generateKey('llm', this.hashString(prompt));
    return await this.get(key);
  }

  async setLLMResponse(prompt, response, ttl = this.defaultTTL) {
    const key = this.generateKey('llm', this.hashString(prompt));
    return await this.set(key, response, ttl);
  }

  /**
   * Embedding缓存
   */
  async getEmbedding(text) {
    const key = this.generateKey('embedding', this.hashString(text));
    return await this.get(key);
  }

  async setEmbedding(text, embedding, ttl = 604800) {
    // 默认缓存7天
    const key = this.generateKey('embedding', this.hashString(text));
    return await this.set(key, embedding, ttl);
  }

  /**
   * 简单哈希函数
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 关闭连接
   */
  async close() {
    await this.redis.quit();
    logger.info('Redis连接已关闭');
  }
}

// 单例
const cacheManager = new CacheManager();

module.exports = cacheManager;
