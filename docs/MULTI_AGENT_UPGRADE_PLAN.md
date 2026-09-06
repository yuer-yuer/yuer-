# Multi-Agent升级方案

## 📋 升级目标

将现有的单Agent多节点架构升级为真正的Multi-Agent系统：
- **Nutrition Agent** - 营养专家
- **Fitness Agent** - 运动教练  
- **Tool Agent** - 工具执行专员
- **Manager Agent** - 任务调度协调者

## 🏗️ 架构对比

### 当前架构（Single-Agent Multi-Node）
```
User → Router → [nutrition_node / fitness_node / general_node / tool_calling_node]
                     ↓ (通过State传递)
                   Response
```

### 升级后架构（Multi-Agent）
```
User → Manager Agent → [消息队列/共享黑板]
                           ↓
       ┌──────────────────┼──────────────────┐
       ↓                  ↓                  ↓
  Nutrition Agent    Fitness Agent     Tool Agent
       ↓                  ↓                  ↓
   [各自的State]     [各自的State]      [各自的State]
       ↓                  ↓                  ↓
       └──────────────────┴──────────────────┘
                           ↓
                    Manager Agent (汇总)
                           ↓
                        Response
```

## 🔧 实现方案

### 方案一：LangGraph SubGraph (推荐)

**优势**：
- 基于现有LangGraph架构，改动最小
- 每个Agent是独立的SubGraph
- 通过State传递实现Agent通信
- LangGraph原生支持，性能好

**架构**：
```javascript
// 主图
Manager Graph
  ├─ router_node (识别意图)
  ├─ dispatch_node (分发任务)
  └─ aggregate_node (汇总结果)

// 子图
NutritionGraph (独立的Agent)
  ├─ rag_node
  ├─ reasoning_node
  └─ response_node

FitnessGraph (独立的Agent)
  ├─ rag_node
  ├─ reasoning_node
  └─ response_node

ToolGraph (独立的Agent)
  ├─ tool_calling_node
  ├─ tool_execution_node
  └─ tool_response_node
```

### 方案二：消息队列通信

**优势**：
- 真正的异步通信
- Agent完全独立
- 可扩展到分布式

**架构**：
```javascript
// 使用EventEmitter或消息队列
Manager Agent
  ↓ (publish: task)
Message Queue
  ↓ (subscribe)
[Nutrition Agent, Fitness Agent, Tool Agent]
  ↓ (publish: result)
Message Queue
  ↓ (subscribe)
Manager Agent (aggregate)
```

### 方案三：共享黑板模式

**优势**：
- 所有Agent可见所有信息
- 适合协作任务
- 灵活度高

**架构**：
```javascript
Shared Blackboard (共享状态)
  ├─ userQuery
  ├─ currentTask
  ├─ agentResults { nutrition: {...}, fitness: {...}, tool: {...} }
  └─ finalResponse

All Agents 读写 Blackboard
```

## 📝 详细实现步骤

### Step 1: 创建独立Agent类

```javascript
// agents/langgraph/base-agent.js
class BaseAgent {
  constructor(name, systemPrompt, tools = []) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.llm = this.initLLM();
    this.memory = []; // 短期记忆
  }

  async process(input, context) {
    // 每个Agent独立处理
  }

  async sendMessage(toAgent, message) {
    // Agent间通信
  }
}
```

### Step 2: 实现三个专业Agent

```javascript
// agents/langgraph/nutrition-agent.js
class NutritionAgent extends BaseAgent {
  constructor() {
    super('Nutrition', nutritionPrompt.system, []);
    this.ragService = hybridRetriever;
  }

  async process(input, context) {
    // 1. RAG检索
    const ragResults = await this.ragService.search(input.query);
    
    // 2. 推理生成
    const response = await this.llm.invoke([...]);
    
    return { agent: this.name, response, ragResults };
  }
}

// agents/langgraph/fitness-agent.js
class FitnessAgent extends BaseAgent { /* 类似实现 */ }

// agents/langgraph/tool-agent.js
class ToolAgent extends BaseAgent {
  constructor() {
    super('Tool', toolPrompt, TOOLS_SCHEMA);
  }

  async process(input, context) {
    // 工具调用逻辑
    const toolCalls = await this.llm.invoke([...]);
    const results = await this.executeTools(toolCalls);
    return { agent: this.name, toolResults: results };
  }
}
```

### Step 3: 创建Manager Agent

```javascript
// agents/langgraph/manager-agent.js
class ManagerAgent {
  constructor() {
    this.agents = {
      nutrition: new NutritionAgent(),
      fitness: new FitnessAgent(),
      tool: new ToolAgent()
    };
    this.messageQueue = new EventEmitter();
  }

  async route(userQuery) {
    // 1. 识别意图
    const intent = await this.detectIntent(userQuery);
    
    // 2. 选择Agent
    const selectedAgent = this.selectAgent(intent);
    
    // 3. 分发任务
    const result = await selectedAgent.process({
      query: userQuery,
      intent: intent
    }, { db: this.db, userId: this.userId });
    
    return result;
  }

  selectAgent(intent) {
    const mapping = {
      'nutrition': this.agents.nutrition,
      'fitness': this.agents.fitness,
      'tool_calling': this.agents.tool
    };
    return mapping[intent] || this.agents.nutrition;
  }
}
```

### Step 4: 实现Agent通信

#### 4.1 消息格式
```javascript
const Message = {
  from: 'nutrition_agent',
  to: 'tool_agent',
  type: 'request', // request / response / broadcast
  content: {
    action: 'query_food_calories',
    params: { foodName: '鸡蛋' }
  },
  timestamp: Date.now(),
  messageId: 'msg_xxx'
};
```

#### 4.2 通信机制
```javascript
// agents/langgraph/message-bus.js
class MessageBus extends EventEmitter {
  constructor() {
    super();
    this.messageHistory = [];
  }

  send(message) {
    this.messageHistory.push(message);
    this.emit(`message:${message.to}`, message);
    this.emit('message:all', message);
  }

  subscribe(agentName, callback) {
    this.on(`message:${agentName}`, callback);
  }

  broadcast(message) {
    this.emit('message:all', message);
  }
}

const messageBus = new MessageBus();
```

### Step 5: 更新Graph结构

```javascript
// agents/langgraph/multi-agent-graph.js
function createMultiAgentGraph() {
  const workflow = new StateGraph(MultiAgentState);

  // Manager层
  workflow.addNode('manager_route', managerRouteNode);
  workflow.addNode('manager_aggregate', managerAggregateNode);

  // Agent层（作为SubGraph）
  workflow.addNode('nutrition_agent', createNutritionAgentGraph());
  workflow.addNode('fitness_agent', createFitnessAgentGraph());
  workflow.addNode('tool_agent', createToolAgentGraph());

  // 路由逻辑
  workflow.setEntryPoint('manager_route');
  
  workflow.addConditionalEdges('manager_route', (state) => {
    return state.selectedAgent; // 'nutrition_agent' / 'fitness_agent' / 'tool_agent'
  });

  // 所有Agent执行完毕后汇总
  workflow.addEdge('nutrition_agent', 'manager_aggregate');
  workflow.addEdge('fitness_agent', 'manager_aggregate');
  workflow.addEdge('tool_agent', 'manager_aggregate');
  workflow.addEdge('manager_aggregate', END);

  return workflow.compile();
}
```

### Step 6: 实现Agent协作场景

#### 场景1: Nutrition Agent 请求 Tool Agent 查询食物热量
```javascript
// Nutrition Agent内部
async process(input) {
  // 发现需要查询食物热量
  if (this.needsFoodCalories(input.query)) {
    // 请求Tool Agent
    const message = {
      from: 'nutrition_agent',
      to: 'tool_agent',
      type: 'request',
      content: {
        action: 'search_food_database',
        params: { food_name: '鸡蛋' }
      }
    };
    
    const response = await this.sendMessageAndWait(message);
    
    // 基于Tool Agent的结果继续处理
    return this.generateAdvice(input.query, response.data);
  }
}
```

#### 场景2: Manager协调多个Agent
```javascript
// 用户问："帮我制定一个减肥计划"
async handleComplexQuery(query) {
  // Manager分解任务
  const tasks = [
    { agent: 'nutrition', task: '制定饮食计划' },
    { agent: 'fitness', task: '制定运动计划' },
    { agent: 'tool', task: '查询用户历史数据' }
  ];

  // 并行执行
  const results = await Promise.all(
    tasks.map(t => this.agents[t.agent].process({
      query: t.task,
      context: this.sharedContext
    }))
  );

  // 汇总结果
  return this.aggregateResults(results);
}
```

## 📊 State设计

### MultiAgentState
```javascript
const MultiAgentState = Annotation.Root({
  // 用户输入
  userQuery: Annotation({ ... }),
  
  // Manager层
  intent: Annotation({ ... }),
  selectedAgent: Annotation({ ... }),
  
  // Agent通信
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),
  
  // Agent结果
  agentResults: Annotation({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({})
  }),
  
  // 共享上下文
  sharedContext: Annotation({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({
      userId: null,
      db: null,
      ragResults: [],
      toolResults: []
    })
  }),
  
  // 最终响应
  finalResponse: Annotation({ ... })
});
```

## 🎯 关键优势

### 升级后的好处
1. **真正的并行处理** - 多个Agent可以同时工作
2. **专业化分工** - 每个Agent专注自己的领域
3. **灵活扩展** - 新增Agent不影响现有系统
4. **协作能力** - Agent间可以互相请求帮助
5. **独立部署** - 每个Agent可以独立扩展/升级

### 示例场景
```
用户: "我今天吃了鸡蛋，帮我记录并分析营养"

Manager Agent: 识别需要Tool + Nutrition两个Agent

1. Tool Agent: 
   - 调用log_meal记录鸡蛋
   - 调用search_food_database查询营养成分
   - 返回结果给Manager

2. Nutrition Agent:
   - 接收Tool Agent的数据
   - 基于RAG检索营养知识
   - 生成营养分析建议

3. Manager Agent:
   - 汇总两个Agent的结果
   - 生成完整回复
```

## 📁 文件结构

```
agents/langgraph/
├── multi-agent/
│   ├── base-agent.js          # Agent基类
│   ├── nutrition-agent.js     # 营养Agent
│   ├── fitness-agent.js       # 运动Agent
│   ├── tool-agent.js          # 工具Agent
│   ├── manager-agent.js       # 管理Agent
│   ├── message-bus.js         # 消息总线
│   ├── shared-blackboard.js   # 共享黑板（可选）
│   └── multi-agent-graph.js   # Multi-Agent图定义
├── state.js                   # 更新为MultiAgentState
└── ...
```

## ⚡ 实施优先级

### Phase 1: 基础架构（1-2天）
- [ ] 创建BaseAgent类
- [ ] 创建MessageBus通信机制
- [ ] 更新State定义

### Phase 2: Agent实现（2-3天）
- [ ] 实现NutritionAgent
- [ ] 实现FitnessAgent  
- [ ] 实现ToolAgent
- [ ] 实现ManagerAgent

### Phase 3: Graph重构（1-2天）
- [ ] 创建Multi-Agent Graph
- [ ] 实现条件路由
- [ ] 实现结果汇总

### Phase 4: 测试验证（1天）
- [ ] 单Agent测试
- [ ] Agent协作测试
- [ ] 性能测试

## 🎯 成功标准

- [ ] 三个Agent可以独立运行
- [ ] Agent间可以互相通信
- [ ] Manager可以协调多Agent任务
- [ ] 支持并行执行
- [ ] 保持现有功能不受影响

---

**建议**: 先实现方案一（LangGraph SubGraph），因为改动最小，风险最低，且符合LangGraph的最佳实践。
