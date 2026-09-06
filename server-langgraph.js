/**
 * 慢慢瘦 - LangGraph版服务器
 */

require('dotenv').config({ path: '.env.agent' });

const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const { getGraph } = require('./agents/langgraph');
const logger = require('./utils/logger');

// 初始化数据库
const db = new Database(path.join(__dirname, 'data', 'database.sqlite'));
db.pragma('journal_mode = WAL');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: 'langgraph-v1.0' });
});

/**
 * LangGraph对话接口
 */
app.post('/api/chat-langgraph', async (req, res) => {
  const { message, userId = 'default', sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  try {
    logger.info('收到用户消息', { userId, sessionId, message });

    // 获取Graph实例
    const graph = getGraph();

    // 准备输入状态
    const input = {
      userQuery: message,
      metadata: {
        userId,
        sessionId: sessionId || `session_${Date.now()}`,
        timestamp: new Date().toISOString(),
        db, // 传递数据库连接
      },
    };

    // 配置（用于checkpointer）
    const config = {
      configurable: {
        thread_id: sessionId || `thread_${userId}_${Date.now()}`,
      },
    };

    // 执行Graph
    const result = await graph.invoke(input, config);

    logger.info('Graph执行完成', {
      intent: result.intent,
      hasRAG: result.ragResults?.length > 0,
      hasToolCalls: result.toolCalls?.length > 0,
    });

    // 返回响应
    res.json({
      response: result.response,
      intent: result.intent,
      ragCount: result.ragResults?.length || 0,
      toolCalls: result.toolCalls?.length || 0,
      toolResults: result.toolResults || [],
      sessionId: config.configurable.thread_id,
    });
  } catch (error) {
    logger.error('对话处理失败', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: '处理消息时出错',
      message: error.message,
    });
  }
});

/**
 * LangGraph流式对话接口
 */
app.post('/api/chat-langgraph-stream', async (req, res) => {
  const { message, userId = 'default', sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  try {
    logger.info('收到流式消息请求', { userId, sessionId, message });

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 获取Graph实例
    const graph = getGraph();

    // 准备输入状态
    const input = {
      userQuery: message,
      metadata: {
        userId,
        sessionId: sessionId || `session_${Date.now()}`,
        timestamp: new Date().toISOString(),
        db, // 传递数据库连接
      },
    };

    // 配置
    const config = {
      configurable: {
        thread_id: sessionId || `thread_${userId}_${Date.now()}`,
      },
    };

    // 流式执行Graph
    const stream = await graph.stream(input, config);

    for await (const chunk of stream) {
      // 发送节点执行状态
      const nodeNames = Object.keys(chunk);
      for (const nodeName of nodeNames) {
        const nodeData = chunk[nodeName];

        // 发送节点状态
        res.write(
          `data: ${JSON.stringify({
            type: 'node',
            node: nodeName,
            data: {
              intent: nodeData.intent,
              ragCount: nodeData.ragResults?.length,
              hasResponse: !!nodeData.response,
            },
          })}\n\n`
        );

        // 如果有最终响应，发送响应
        if (nodeData.response) {
          res.write(
            `data: ${JSON.stringify({
              type: 'response',
              content: nodeData.response,
              intent: nodeData.intent,
              ragCount: nodeData.ragResults?.length || 0,
            })}\n\n`
          );
        }
      }
    }

    // 发送完成信号
    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        sessionId: config.configurable.thread_id,
      })}\n\n`
    );

    res.end();

    logger.info('流式响应完成');
  } catch (error) {
    logger.error('流式对话失败', { error: error.message, stack: error.stack });

    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        error: error.message,
      })}\n\n`
    );

    res.end();
  }
});

// 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`慢慢瘦LangGraph服务器启动成功`, {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
  });
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，准备关闭服务器');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，准备关闭服务器');
  process.exit(0);
});
