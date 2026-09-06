// Winston日志配置
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// 日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 日志颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// 日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 控制台格式（彩色）
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// 日志输出目标
const transports = [
  // 控制台输出
  new winston.transports.Console({
    format: consoleFormat,
  }),

  // 错误日志（按天轮转）
  new DailyRotateFile({
    filename: path.join(__dirname, '../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '30d',
    format,
  }),

  // 所有日志（按天轮转）
  new DailyRotateFile({
    filename: path.join(__dirname, '../logs/app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format,
  }),
];

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  transports,
});

// 便捷方法
logger.logAgentCall = (agentName, input, output, duration) => {
  logger.info('Agent调用', {
    type: 'agent_call',
    agent: agentName,
    inputLength: input.length,
    outputLength: output.length,
    duration,
  });
};

logger.logToolCall = (toolName, args, result, duration) => {
  logger.info('Tool调用', {
    type: 'tool_call',
    tool: toolName,
    args,
    success: !!result,
    duration,
  });
};

logger.logRAGRetrieval = (query, results, duration) => {
  logger.info('RAG检索', {
    type: 'rag_retrieval',
    query,
    resultsCount: results.length,
    duration,
  });
};

logger.logLLMCall = (model, prompt, response, tokens, cost, cached) => {
  logger.info('LLM调用', {
    type: 'llm_call',
    model,
    promptTokens: tokens.prompt,
    completionTokens: tokens.completion,
    totalTokens: tokens.total,
    cost,
    cached,
  });
};

module.exports = logger;
