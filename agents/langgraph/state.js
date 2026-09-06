/**
 * LangGraph 状态定义
 */

const { Annotation } = require('@langchain/langgraph');

/**
 * 对话状态定义
 */
const GraphState = Annotation.Root({
  // 历史消息
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

  // 用户查询
  userQuery: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  // 意图识别结果 (nutrition/fitness/general/tool_calling)
  intent: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  // RAG检索结果
  ragResults: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // 最终回复
  response: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  // 工具调用列表
  toolCalls: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // 工具执行结果
  toolResults: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // LLM响应（包含tool_calls）
  llmResponse: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // 元数据
  metadata: Annotation({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
});

module.exports = { GraphState };
