/**
 * LangGraph 工作流定义
 */

const { StateGraph, END } = require('@langchain/langgraph');
const { GraphState } = require('./state');
const {
  router_node,
  rag_node,
  nutrition_node,
  fitness_node,
  general_node,
  tool_calling_node,
  tool_execution_node,
  tool_response_node,
} = require('./nodes');

/**
 * 创建工作流图
 */
function createGraph() {
  // 创建状态图
  const workflow = new StateGraph(GraphState);

  // 添加节点
  workflow.addNode('router', router_node);
  workflow.addNode('rag', rag_node);
  workflow.addNode('nutrition', nutrition_node);
  workflow.addNode('fitness', fitness_node);
  workflow.addNode('general', general_node);
  workflow.addNode('tool_calling', tool_calling_node);
  workflow.addNode('tool_execution', tool_execution_node);
  workflow.addNode('tool_response', tool_response_node);

  // 设置入口点
  workflow.setEntryPoint('router');

  // 路由节点的条件边
  workflow.addConditionalEdges('router', (state) => {
    const { userQuery } = state;

    // 检测是否是工具调用意图（记录、查询等操作）
    const toolKeywords = ['记录', '查询', '今天吃了', '今天运动', '体重', '历史', '热量'];
    const needsTools = toolKeywords.some(kw => userQuery.includes(kw));

    if (needsTools) {
      return 'tool_calling';
    }

    // 营养和运动咨询需要RAG
    const needRAG = state.intent === 'nutrition' || state.intent === 'fitness';
    return needRAG ? 'rag' : state.intent;
  });

  // RAG节点后根据意图路由
  workflow.addConditionalEdges('rag', (state) => state.intent);

  // 专业节点完成后结束
  workflow.addEdge('nutrition', END);
  workflow.addEdge('fitness', END);
  workflow.addEdge('general', END);

  // 工具调用流程
  workflow.addConditionalEdges('tool_calling', (state) => {
    // 如果需要执行工具
    if (state.metadata.needsToolExecution) {
      return 'tool_execution';
    }
    // 否则直接生成回复（可能是纯咨询）
    return 'tool_response';
  });

  workflow.addEdge('tool_execution', 'tool_response');
  workflow.addEdge('tool_response', END);

  // 编译图
  return workflow.compile();
}

module.exports = { createGraph };
