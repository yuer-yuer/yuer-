/**
 * 慢慢瘦 - Multi-Agent服务器
 */

require('dotenv').config({ path: '.env.agent' });

const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const { getMultiAgentGraph } = require('./agents/langgraph/multi-agent');
const logger = require('./utils/logger');

// 初始化数据库
const db = new Database(path.join(__dirname, 'data', 'database.sqlite'));
db.pragma('journal_mode = WAL');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: 'multi-agent-v1.0' });
});

/**
 * Multi-Agent对话接口
 */
app.post('/api/chat-multi-agent', async (req, res) => {
  const { message, userId = 1, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  try {
    logger.info('收到用户消息', { userId, sessionId, message });

    // 获取Multi-Agent Graph
    const graph = getMultiAgentGraph();

    // 准备输入状态
    const input = {
      userQuery: message,
      sharedContext: {
        userId,
        db,
        sessionId: sessionId || `session_${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    };

    // 执行Graph
    const startTime = Date.now();
    const result = await graph.invoke(input);
    const duration = Date.now() - startTime;

    logger.info('Multi-Agent执行完成', {
      duration,
      executionFlow: result.executionFlow,
      routingDecision: result.routingDecision
    });

    // 返回响应
    res.json({
      response: result.finalResponse,
      routingDecision: result.routingDecision,
      agentResults: result.agentResults,
      executionFlow: result.executionFlow,
      duration,
      sessionId: input.sharedContext.sessionId
    });
  } catch (error) {
    logger.error('Multi-Agent处理失败', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: '处理消息时出错',
      message: error.message
    });
  }
});

/**
 * Multi-Agent流式对话接口
 */
app.post('/api/chat-multi-agent-stream', async (req, res) => {
  const { message, userId = 1, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  try {
    logger.info('收到流式消息请求', { userId, sessionId, message });

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 获取Graph
    const graph = getMultiAgentGraph();

    // 准备输入
    const input = {
      userQuery: message,
      sharedContext: {
        userId,
        db,
        sessionId: sessionId || `session_${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    };

    // 流式执行
    const stream = await graph.stream(input);

    for await (const chunk of stream) {
      const nodeNames = Object.keys(chunk);

      for (const nodeName of nodeNames) {
        const nodeData = chunk[nodeName];

        // 发送节点执行状态
        res.write(
          `data: ${JSON.stringify({
            type: 'node',
            node: nodeName,
            data: {
              executionFlow: nodeData.executionFlow,
              routingDecision: nodeData.routingDecision
            }
          })}\n\n`
        );

        // 如果有最终响应，发送
        if (nodeData.finalResponse) {
          res.write(
            `data: ${JSON.stringify({
              type: 'response',
              content: nodeData.finalResponse,
              routingDecision: nodeData.routingDecision,
              executionFlow: nodeData.executionFlow
            })}\n\n`
          );
        }
      }
    }

    // 发送完成信号
    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        sessionId: input.sharedContext.sessionId
      })}\n\n`
    );

    res.end();
    logger.info('流式响应完成');
  } catch (error) {
    logger.error('流式Multi-Agent失败', { error: error.message, stack: error.stack });

    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        error: error.message
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
  logger.info(`Multi-Agent服务器启动成功`, {
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
  console.log(`🚀 Multi-Agent服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，准备关闭服务器');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，准备关闭服务器');
  db.close();
  process.exit(0);
});
