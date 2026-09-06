// 指标收集
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class MetricsCollector {
  constructor() {
    this.metrics = {
      // LLM调用统计
      llm: {
        totalCalls: 0,
        cachedCalls: 0,
        tokensUsed: 0,
        tokensSaved: 0,
        totalCost: 0,
        costSaved: 0,
      },

      // Agent调用统计
      agents: {
        totalCalls: 0,
        byAgent: {}, // { nutrition: 10, fitness: 5, general: 3 }
      },

      // Tool调用统计
      tools: {
        totalCalls: 0,
        successCalls: 0,
        failedCalls: 0,
        byTool: {}, // { food_query: 5, calc_engine: 3, ... }
      },

      // RAG检索统计
      rag: {
        totalQueries: 0,
        avgResultsCount: 0,
        avgDuration: 0,
      },

      // 响应时间统计
      performance: {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        responseTimes: [], // 最近100次响应时间
      },
    };

    // GLM-4-Flash价格（元/1M tokens）
    this.pricing = {
      'glm-4-flash': {
        input: 0.1, // 0.1元/1M tokens
        output: 0.1,
      },
    };
  }

  /**
   * 记录LLM调用
   */
  recordLLMCall(model, tokens, cached = false) {
    this.metrics.llm.totalCalls++;

    if (cached) {
      this.metrics.llm.cachedCalls++;
      this.metrics.llm.tokensSaved += tokens.total;

      // 计算节省的成本
      const cost = this.calculateCost(model, tokens);
      this.metrics.llm.costSaved += cost;
    } else {
      this.metrics.llm.tokensUsed += tokens.total;

      // 计算实际成本
      const cost = this.calculateCost(model, tokens);
      this.metrics.llm.totalCost += cost;
    }
  }

  /**
   * 计算LLM调用成本
   */
  calculateCost(model, tokens) {
    const pricing = this.pricing[model] || this.pricing['glm-4-flash'];
    const inputCost = (tokens.prompt / 1000000) * pricing.input;
    const outputCost = (tokens.completion / 1000000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * 记录Agent调用
   */
  recordAgentCall(agentName) {
    this.metrics.agents.totalCalls++;

    if (!this.metrics.agents.byAgent[agentName]) {
      this.metrics.agents.byAgent[agentName] = 0;
    }
    this.metrics.agents.byAgent[agentName]++;
  }

  /**
   * 记录Tool调用
   */
  recordToolCall(toolName, success) {
    this.metrics.tools.totalCalls++;

    if (success) {
      this.metrics.tools.successCalls++;
    } else {
      this.metrics.tools.failedCalls++;
    }

    if (!this.metrics.tools.byTool[toolName]) {
      this.metrics.tools.byTool[toolName] = { success: 0, failed: 0 };
    }

    if (success) {
      this.metrics.tools.byTool[toolName].success++;
    } else {
      this.metrics.tools.byTool[toolName].failed++;
    }
  }

  /**
   * 记录RAG检索
   */
  recordRAGQuery(resultsCount, duration) {
    this.metrics.rag.totalQueries++;

    // 计算平均结果数
    const totalResults = this.metrics.rag.avgResultsCount * (this.metrics.rag.totalQueries - 1) + resultsCount;
    this.metrics.rag.avgResultsCount = totalResults / this.metrics.rag.totalQueries;

    // 计算平均检索时间
    const totalDuration = this.metrics.rag.avgDuration * (this.metrics.rag.totalQueries - 1) + duration;
    this.metrics.rag.avgDuration = totalDuration / this.metrics.rag.totalQueries;
  }

  /**
   * 记录响应时间
   */
  recordResponseTime(duration) {
    this.metrics.performance.responseTimes.push(duration);

    // 只保留最近100次
    if (this.metrics.performance.responseTimes.length > 100) {
      this.metrics.performance.responseTimes.shift();
    }

    // 计算平均响应时间
    const sum = this.metrics.performance.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.performance.avgResponseTime = sum / this.metrics.performance.responseTimes.length;

    // 计算P95响应时间
    const sorted = [...this.metrics.performance.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    this.metrics.performance.p95ResponseTime = sorted[p95Index] || 0;
  }

  /**
   * 获取指标
   */
  getMetrics() {
    return {
      ...this.metrics,
      llm: {
        ...this.metrics.llm,
        cacheHitRate: this.metrics.llm.totalCalls > 0
          ? (this.metrics.llm.cachedCalls / this.metrics.llm.totalCalls).toFixed(2)
          : 0,
      },
      tools: {
        ...this.metrics.tools,
        successRate: this.metrics.tools.totalCalls > 0
          ? (this.metrics.tools.successCalls / this.metrics.tools.totalCalls).toFixed(2)
          : 0,
      },
    };
  }

  /**
   * 保存指标到文件
   */
  saveMetrics() {
    try {
      const metricsDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(metricsDir)) {
        fs.mkdirSync(metricsDir, { recursive: true });
      }

      const date = new Date().toISOString().split('T')[0];
      const filename = path.join(metricsDir, `metrics-${date}.json`);

      fs.writeFileSync(filename, JSON.stringify(this.getMetrics(), null, 2));
      logger.info('指标已保存', { filename });
    } catch (error) {
      logger.error('保存指标失败', { error: error.message });
    }
  }

  /**
   * 重置指标
   */
  reset() {
    this.metrics = {
      llm: {
        totalCalls: 0,
        cachedCalls: 0,
        tokensUsed: 0,
        tokensSaved: 0,
        totalCost: 0,
        costSaved: 0,
      },
      agents: {
        totalCalls: 0,
        byAgent: {},
      },
      tools: {
        totalCalls: 0,
        successCalls: 0,
        failedCalls: 0,
        byTool: {},
      },
      rag: {
        totalQueries: 0,
        avgResultsCount: 0,
        avgDuration: 0,
      },
      performance: {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        responseTimes: [],
      },
    };
    logger.info('指标已重置');
  }
}

// 单例
const metricsCollector = new MetricsCollector();

// 每小时保存一次指标
setInterval(() => {
  metricsCollector.saveMetrics();
}, 3600000); // 1小时

module.exports = metricsCollector;
