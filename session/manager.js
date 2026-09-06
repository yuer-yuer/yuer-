// 会话管理器
const logger = require('../monitoring/logger');
const { v4: uuidv4 } = require('uuid');

class SessionManager {
  constructor() {
    // 内存存储会话（生产环境应使用Redis）
    this.sessions = new Map();

    // 会话配置
    this.config = {
      maxMessages: 20,           // 最多保留20条消息
      sessionTimeout: 30 * 60 * 1000, // 30分钟超时
      cleanupInterval: 5 * 60 * 1000,  // 每5分钟清理一次
    };

    // 启动定期清理
    this.startCleanup();
  }

  /**
   * 创建新会话
   */
  createSession(userId = 'anonymous') {
    const sessionId = uuidv4();

    const session = {
      sessionId,
      userId,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      messages: [],
      metadata: {
        messageCount: 0,
        intents: [],
      },
    };

    this.sessions.set(sessionId, session);

    logger.info('会话创建', { sessionId, userId });

    return session;
  }

  /**
   * 获取会话
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      logger.warn('会话不存在', { sessionId });
      return null;
    }

    // 检查是否超时
    const now = Date.now();
    if (now - session.lastActiveAt > this.config.sessionTimeout) {
      logger.warn('会话已超时', { sessionId });
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * 更新会话活跃时间
   */
  touchSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActiveAt = Date.now();
    }
  }

  /**
   * 添加消息到会话
   */
  addMessage(sessionId, role, content, metadata = {}) {
    const session = this.getSession(sessionId);

    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    const message = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now(),
      metadata,
    };

    session.messages.push(message);
    session.metadata.messageCount++;

    // 记录意图
    if (metadata.intent) {
      session.metadata.intents.push(metadata.intent);
    }

    // 限制消息数量（保留最近N条）
    if (session.messages.length > this.config.maxMessages) {
      const removed = session.messages.shift();
      logger.debug('消息被移除（达到上限）', { sessionId, messageId: removed.id });
    }

    this.touchSession(sessionId);

    logger.debug('消息已添加', { sessionId, role, messageId: message.id });

    return message;
  }

  /**
   * 获取会话消息历史
   */
  getMessages(sessionId, limit = null) {
    const session = this.getSession(sessionId);

    if (!session) {
      return [];
    }

    const messages = session.messages;

    if (limit && limit > 0) {
      return messages.slice(-limit);
    }

    return messages;
  }

  /**
   * 获取上下文（格式化为Prompt）
   */
  getContext(sessionId, maxTurns = 5) {
    const messages = this.getMessages(sessionId, maxTurns * 2);

    if (messages.length === 0) {
      return '';
    }

    let context = '【对话历史】\n\n';

    messages.forEach((msg, idx) => {
      const speaker = msg.role === 'user' ? '用户' : 'AI';
      context += `${speaker}：${msg.content}\n`;
    });

    return context;
  }

  /**
   * 清除会话
   */
  clearSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (session) {
      this.sessions.delete(sessionId);
      logger.info('会话已清除', { sessionId });
      return true;
    }

    return false;
  }

  /**
   * 获取会话统计
   */
  getSessionStats(sessionId) {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    const duration = Date.now() - session.createdAt;
    const idleTime = Date.now() - session.lastActiveAt;

    return {
      sessionId,
      userId: session.userId,
      messageCount: session.metadata.messageCount,
      intents: [...new Set(session.metadata.intents)],
      duration: Math.floor(duration / 1000), // 秒
      idleTime: Math.floor(idleTime / 1000), // 秒
      createdAt: new Date(session.createdAt).toISOString(),
      lastActiveAt: new Date(session.lastActiveAt).toISOString(),
    };
  }

  /**
   * 获取所有活跃会话
   */
  getActiveSessions() {
    const now = Date.now();
    const active = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActiveAt < this.config.sessionTimeout) {
        active.push({
          sessionId,
          userId: session.userId,
          messageCount: session.messages.length,
          lastActiveAt: new Date(session.lastActiveAt).toISOString(),
        });
      }
    }

    return active;
  }

  /**
   * 启动定期清理
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    logger.info('会话清理任务已启动', {
      interval: this.config.cleanupInterval / 1000 + '秒'
    });
  }

  /**
   * 清理超时会话
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActiveAt > this.config.sessionTimeout) {
        this.sessions.delete(sessionId);
        cleanedCount++;
        logger.debug('清理超时会话', { sessionId });
      }
    }

    if (cleanedCount > 0) {
      logger.info('会话清理完成', {
        cleanedCount,
        remainingCount: this.sessions.size
      });
    }
  }

  /**
   * 获取系统统计
   */
  getSystemStats() {
    return {
      totalSessions: this.sessions.size,
      activeSessions: this.getActiveSessions().length,
      config: this.config,
    };
  }
}

// 单例
const sessionManager = new SessionManager();

module.exports = sessionManager;
