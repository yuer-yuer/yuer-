# LangGraph Multi-Agent智能编排方案

## 🎯 核心思路

**完全依靠LangGraph的能力**：
- ✅ 条件路由（Conditional Edges） - 动态决策
- ✅ SubGraph（子图） - 每个Agent是独立的图
- ✅ State管理 - Agent间数据共享
- ✅ 消息传递（Messages） - Agent通信
- ✅ 并行执行（Parallel） - 多Agent同时工作

**不用if-else，全部用LangGraph的智能路由！**

## 🏗️ 架构设计

### 整体结构
```
MainGraph (Manager层)
├─ router_node (LLM动态路由)
├─ NutritionSubGraph
├─ FitnessSubGraph
├─ ToolSubGraph
└─ aggregator_node (汇总结果)
```

---

## 📝 实现代码

### 1. 定义Multi-Agent State

```javascript
// agents/langgraph/multi-agent/state.js
const { Annotation } = require('@langchain/langgraph');

/**
 * Multi-Agent共享状态
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

  // 执行状态
  executionFlow: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => []
  })
});

module.exports = { MultiAgentState };
```

### 2. 智能路由节点（LLM决策）

```javascript
// agents/langgraph/multi-agent/nodes/router-node.js
const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

const routerLLM = new ChatOpenAI({
  configuration: { baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  apiKey: process.env.DASHSCOPE_API_KEY,
  model: 'qwen-plus',
  temperature: 0.3, // 低温度，更确定的决策
});

/**
 * 智能路由节点 - LLM动态决策使用哪些Agent
 */
async function router_node(state) {
  const { userQuery } = state;

  const systemPrompt = `你是一个智能任务分析器，负责决定如何调度三个专业Agent：

**可用Agent**：
1. nutrition_agent - 营养专家（回答营养问题、分析饮食健康、提供饮食建议）
2. fitness_agent - 运动教练（回答运动问题、制定训练计划、分析运动效果）
3. tool_agent - 数据工具（记录饮食/运动/体重、查询历史数据、搜索食物热量）

**执行模式**：
- single: 单个Agent独立处理
- sequential: 多个Agent串行执行（前一个的结果传给后一个）
- parallel: 多个Agent并行执行（同时工作，最后汇总）

**分析用户需求，返回JSON格式的执行计划**：
{
  "agents": ["agent名称"],
  "mode": "执行模式",
  "reasoning": "你的推理过程"
}`;

  const userPrompt = `用户需求: "${userQuery}"

请分析并返回执行计划。`;

  try {
    const response = await routerLLM.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);

    // 解析LLM返回的JSON
    const decision = JSON.parse(response.content);

    console.log('🧠 路由决策:', decision);

    return {
      routingDecision: decision,
      messages: state.messages.concat([
        { role: 'system', content: `路由决策: ${decision.reasoning}` }
      ]),
      executionFlow: state.executionFlow.concat(['router'])
    };
  } catch (error) {
    console.error('路由决策失败:', error);
    // 降级策略
    return {
      routingDecision: {
        agents: ['nutrition'],
        mode: 'single',
        reasoning: '默认使用营养专家'
      }
    };
  }
}

module.exports = { router_node };
```

### 3. 创建Agent SubGraph

```javascript
// agents/langgraph/multi-agent/subgraphs/nutrition-subgraph.js
const { StateGraph, END } = require('@langchain/langgraph');
const { Annotation } = require('@langchain/langgraph');

/**
 * Nutrition Agent的内部状态
 */
const NutritionState = Annotation.Root({
  input: Annotation({ reducer: (x, y) => y ?? x, default: () => ({}) }),
  ragResults: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
  response: Annotation({ reducer: (x, y) => y ?? x, default: () => '' })
});

/**
 * Nutrition Agent的节点
 */
async function nutrition_rag_node(state) {
  const { input } = state;
  const { userQuery, sharedContext } = input;

  // RAG检索
  const { hybridRetriever } = require('../../../../rag');
  const ragResults = await hybridRetriever.search(userQuery, {
    category: 'nutrition',
    topK: 5
  });

  return { ragResults };
}

async function nutrition_reasoning_node(state) {
  const { input, ragResults } = state;
  const { userQuery, sharedContext } = input;

  const llm = new ChatOpenAI({ /* ... */ });
  const nutritionPrompt = require('../../../prompts/nutrition');

  // 构建上下文
  let context = ragResults.map((r, i) => `[${i + 1}] ${r.content}`).join('\n\n');

  // 如果有Tool Agent的数据，也加入上下文
  if (sharedContext.toolData) {
    context += `\n\n【用户数据】\n${JSON.stringify(sharedContext.toolData, null, 2)}`;
  }

  const prompt = nutritionPrompt.user
    .replace('{context}', context)
    .replace('{query}', userQuery);

  const response = await llm.invoke([
    new SystemMessage(nutritionPrompt.system),
    new HumanMessage(prompt)
  ]);

  return { response: response.content };
}

/**
 * 创建Nutrition SubGraph
 */
function createNutritionSubGraph() {
  const workflow = new StateGraph(NutritionState);

  workflow.addNode('rag', nutrition_rag_node);
  workflow.addNode('reasoning', nutrition_reasoning_node);

  workflow.setEntryPoint('rag');
  workflow.addEdge('rag', 'reasoning');
  workflow.addEdge('reasoning', END);

  return workflow.compile();
}

module.exports = { createNutritionSubGraph };
```

```javascript
// agents/langgraph/multi-agent/subgraphs/fitness-subgraph.js
// 类似Nutrition，省略...

// agents/langgraph/multi-agent/subgraphs/tool-subgraph.js
// 包含tool_calling, tool_execution, tool_response三个节点
```

### 4. SubGraph包装节点

```javascript
// agents/langgraph/multi-agent/nodes/agent-nodes.js
const { createNutritionSubGraph } = require('../subgraphs/nutrition-subgraph');
const { createFitnessSubGraph } = require('../subgraphs/fitness-subgraph');
const { createToolSubGraph } = require('../subgraphs/tool-subgraph');

/**
 * Nutrition Agent节点（包装SubGraph）
 */
async function nutrition_agent_node(state) {
  const nutritionGraph = createNutritionSubGraph();

  const result = await nutritionGraph.invoke({
    input: {
      userQuery: state.userQuery,
      sharedContext: state.sharedContext
    }
  });

  return {
    agentResults: {
      ...state.agentResults,
      nutrition: result.response
    },
    messages: state.messages.concat([
      { role: 'assistant', agent: 'nutrition', content: result.response }
    ]),
    executionFlow: state.executionFlow.concat(['nutrition_agent'])
  };
}

/**
 * Fitness Agent节点
 */
async function fitness_agent_node(state) {
  const fitnessGraph = createFitnessSubGraph();

  const result = await fitnessGraph.invoke({
    input: {
      userQuery: state.userQuery,
      sharedContext: state.sharedContext
    }
  });

  return {
    agentResults: {
      ...state.agentResults,
      fitness: result.response
    },
    messages: state.messages.concat([
      { role: 'assistant', agent: 'fitness', content: result.response }
    ]),
    executionFlow: state.executionFlow.concat(['fitness_agent'])
  };
}

/**
 * Tool Agent节点
 */
async function tool_agent_node(state) {
  const toolGraph = createToolSubGraph();

  const result = await toolGraph.invoke({
    input: {
      userQuery: state.userQuery,
      sharedContext: state.sharedContext
    }
  });

  // Tool的结果放入sharedContext供其他Agent使用
  return {
    agentResults: {
      ...state.agentResults,
      tool: result.response
    },
    sharedContext: {
      ...state.sharedContext,
      toolData: result.toolResults // 其他Agent可以访问
    },
    messages: state.messages.concat([
      { role: 'assistant', agent: 'tool', content: result.response }
    ]),
    executionFlow: state.executionFlow.concat(['tool_agent'])
  };
}

module.exports = {
  nutrition_agent_node,
  fitness_agent_node,
  tool_agent_node
};
```

### 5. 汇总节点

```javascript
// agents/langgraph/multi-agent/nodes/aggregator-node.js

/**
 * 结果汇总节点 - 可选的二次加工
 */
async function aggregator_node(state) {
  const { routingDecision, agentResults } = state;

  // 如果只有一个Agent，直接返回
  if (routingDecision.agents.length === 1) {
    const agentName = routingDecision.agents[0].replace('_agent', '');
    return {
      finalResponse: agentResults[agentName]
    };
  }

  // 多个Agent，汇总结果
  let finalResponse = '';

  if (agentResults.tool) {
    finalResponse += agentResults.tool + '\n\n';
  }
  if (agentResults.nutrition) {
    finalResponse += '📊 营养分析：\n' + agentResults.nutrition + '\n\n';
  }
  if (agentResults.fitness) {
    finalResponse += '💪 运动建议：\n' + agentResults.fitness;
  }

  return {
    finalResponse: finalResponse.trim(),
    executionFlow: state.executionFlow.concat(['aggregator'])
  };
}

module.exports = { aggregator_node };
```

### 6. 主图 - LangGraph智能路由

```javascript
// agents/langgraph/multi-agent/main-graph.js
const { StateGraph, END } = require('@langchain/langgraph');
const { MultiAgentState } = require('./state');
const { router_node } = require('./nodes/router-node');
const {
  nutrition_agent_node,
  fitness_agent_node,
  tool_agent_node
} = require('./nodes/agent-nodes');
const { aggregator_node } = require('./nodes/aggregator-node');

/**
 * 创建Multi-Agent主图
 */
function createMultiAgentGraph() {
  const workflow = new StateGraph(MultiAgentState);

  // 添加节点
  workflow.addNode('router', router_node);
  workflow.addNode('nutrition_agent', nutrition_agent_node);
  workflow.addNode('fitness_agent', fitness_agent_node);
  workflow.addNode('tool_agent', tool_agent_node);
  workflow.addNode('aggregator', aggregator_node);

  // 设置入口
  workflow.setEntryPoint('router');

  // 🧠 关键：LangGraph条件路由 - 基于LLM的决策动态选择路径
  workflow.addConditionalEdges(
    'router',
    (state) => {
      const { agents, mode } = state.routingDecision;

      // single模式 - 直接路由到对应Agent
      if (mode === 'single') {
        return agents[0]; // 'nutrition_agent' / 'fitness_agent' / 'tool_agent'
      }

      // sequential模式 - 先执行第一个Agent
      if (mode === 'sequential') {
        return agents[0];
      }

      // parallel模式 - 需要特殊处理（见下方）
      if (mode === 'parallel') {
        return 'parallel_dispatch';
      }

      // 降级
      return 'nutrition_agent';
    },
    {
      // 定义所有可能的路由目标
      nutrition_agent: 'nutrition_agent',
      fitness_agent: 'fitness_agent',
      tool_agent: 'tool_agent',
      parallel_dispatch: 'parallel_dispatch'
    }
  );

  // 单Agent模式 - 直接到汇总
  workflow.addEdge('nutrition_agent', 'aggregator');
  workflow.addEdge('fitness_agent', 'aggregator');
  workflow.addEdge('tool_agent', 'aggregator');

  // sequential模式 - 第一个Agent完成后路由到第二个
  workflow.addConditionalEdges(
    'tool_agent',
    (state) => {
      const { agents, mode } = state.routingDecision;
      
      // 如果是sequential且Tool是第一个，路由到第二个Agent
      if (mode === 'sequential' && agents[0] === 'tool_agent' && agents.length > 1) {
        return agents[1]; // 'nutrition_agent' / 'fitness_agent'
      }
      
      return 'aggregator';
    },
    {
      nutrition_agent: 'nutrition_agent',
      fitness_agent: 'fitness_agent',
      aggregator: 'aggregator'
    }
  );

  // 汇总后结束
  workflow.addEdge('aggregator', END);

  return workflow.compile();
}

module.exports = { createMultiAgentGraph };
```

### 7. 并行执行支持

```javascript
// agents/langgraph/multi-agent/nodes/parallel-dispatch.js

/**
 * 并行分发节点 - 同时调用多个Agent
 */
async function parallel_dispatch_node(state) {
  const { routingDecision } = state;
  const { agents } = routingDecision;

  // LangGraph不直接支持动态并行，这里用Promise.all模拟
  const agentMap = {
    nutrition_agent: nutrition_agent_node,
    fitness_agent: fitness_agent_node,
    tool_agent: tool_agent_node
  };

  const results = await Promise.all(
    agents.map(agentName => agentMap[agentName](state))
  );

  // 合并所有Agent的结果
  const mergedResults = results.reduce((acc, result) => ({
    agentResults: { ...acc.agentResults, ...result.agentResults },
    messages: acc.messages.concat(result.messages),
    sharedContext: { ...acc.sharedContext, ...result.sharedContext },
    executionFlow: acc.executionFlow.concat(result.executionFlow)
  }), {
    agentResults: state.agentResults,
    messages: state.messages,
    sharedContext: state.sharedContext,
    executionFlow: state.executionFlow
  });

  return mergedResults;
}

// 在main-graph.js中添加此节点
workflow.addNode('parallel_dispatch', parallel_dispatch_node);
workflow.addEdge('parallel_dispatch', 'aggregator');
```

---

## 🎯 运行示例

### 场景1: 单Agent
```javascript
输入: "减肥可以吃鸡蛋吗"

LLM路由决策: {
  agents: ['nutrition_agent'],
  mode: 'single',
  reasoning: '用户咨询营养问题，只需营养专家回答'
}

执行流程:
router → nutrition_agent → aggregator → END
```

### 场景2: 串行执行
```javascript
输入: "记录早餐鸡蛋60克，并分析营养"

LLM路由决策: {
  agents: ['tool_agent', 'nutrition_agent'],
  mode: 'sequential',
  reasoning: '需要先记录数据，再基于数据分析营养'
}

执行流程:
router → tool_agent (记录) → nutrition_agent (分析) → aggregator → END
```

### 场景3: 并行执行
```javascript
输入: "分析我今天的健康状况"

LLM路由决策: {
  agents: ['tool_agent', 'nutrition_agent', 'fitness_agent'],
  mode: 'sequential', // Tool先查数据
  reasoning: 'Tool先查询数据，然后Nutrition和Fitness并行分析'
}

执行流程:
router → tool_agent (查数据) → parallel_dispatch
                                  ├─ nutrition_agent
                                  └─ fitness_agent
                                  → aggregator → END
```

---

## ✅ 优势总结

1. **零if-else** - 全部由LLM和LangGraph条件路由决策
2. **动态灵活** - LLM理解各种表达方式
3. **Agent隔离** - 每个Agent是独立SubGraph
4. **状态共享** - 通过MultiAgentState传递数据
5. **可扩展** - 添加新Agent只需加新SubGraph和路由规则
6. **可观测** - executionFlow记录完整执行路径

这就是纯LangGraph的Multi-Agent方案！
