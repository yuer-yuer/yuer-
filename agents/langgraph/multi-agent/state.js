/**
 * Multi-Agent共享状态定义
 */

const { Annotation } = require('@langchain/langgraph');

/**
 * Multi-Agent状态
 */
const MultiAgentState = Annotation.Root({
  // 用户输入
  userQuery: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ''
  }),

  // 消息历史（Agent间通信）
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),

  // 路由决策（LLM动态生成）
  routingDecision: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ({
      agents: [],      // ['nutrition', 'fitness', 'tool']
      mode: 'single',  // 'single' / 'sequential' / 'parallel'
      reasoning: ''    // LLM的推理过程
    })
  }),

  // 各Agent的结果
  agentResults: Annotation({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({
      nutrition: null,
      fitness: null,
      tool: null
    })
  }),

  // 共享上下文（Agent间数据共享）
  sharedContext: Annotation({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({
      userId: null,
      db: null,
      toolData: null,    // Tool Agent的结果供其他Agent使用
      ragResults: []
    })
  }),

  // 最终响应
  finalResponse: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ''
  }),

  // 执行流程追踪
  executionFlow: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => []
  })
});

module.exports = { MultiAgentState };
