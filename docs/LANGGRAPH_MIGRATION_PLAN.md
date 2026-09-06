# LangGraph 重构计划

## 项目背景
将现有的多智能体架构（Multi-Agent）迁移到 LangGraph.js 架构，提升对话流程的可控性和可维护性。

## 当前架构分析

### 现有技术栈
- **后端**: Node.js + Express
- **Agent系统**: agents/graph.js - 路由器 + 3个专业Agent
  - Router: 意图识别，路由到专业Agent
  - Nutrition Agent: 营养咨询
  - Fitness Agent: 运动指导  
  - General Agent: 通用对话
- **RAG系统**: 
  - Qdrant (向量检索) - 221个向量，1536维 ✅
  - Elasticsearch (全文检索) - 221个文档 ✅
  - Redis (Embedding缓存) ✅
- **LLM**: 阿里云通义千问 (qwen-plus)
- **Embedding**: 智谱AI embedding-2 (1536维)

### 现有文件结构
```
慢慢瘦/
├── server.js                      # 主服务器
├── agents/
│   ├── graph.js                   # Multi-Agent编排
│   └── prompts/                   # Agent提示词
│       ├── router.js
│       ├── nutrition.js
│       ├── fitness.js
│       └── general.js
├── rag/
│   ├── index.js                   # RAG主入口
│   ├── qdrant.js                  # 向量检索
│   ├── elasticsearch.js           # 全文检索
│   └── embedding.js               # Embedding服务
├── config/
│   └── rag.config.js              # RAG配置（已修复为1536维）
└── knowledge/                     # 知识库Markdown文件
    ├── nutrition/                 # 营养知识（5个文件，100块）
    └── fitness/                   # 运动知识（5个文件，121块）
```

## 重构目标

### 核心目标
1. **状态管理清晰化**: 用StateGraph管理对话状态，替代现有的消息传递
2. **流程可视化**: LangGraph的图结构更易理解和维护
3. **保持功能完整**: 所有现有功能100%保留
4. **性能不降级**: 响应速度和准确度不能下降

### 非目标
- ❌ 不改变前端（HTML/CSS/JS保持不变）
- ❌ 不改变RAG系统（Qdrant/ES/Redis保持不变）
- ❌ 不改变LLM提供商（继续用通义千问）

## LangGraph 架构设计

### 状态定义
```javascript
// GraphState - 对话状态
{
  messages: [],           // 历史消息
  userQuery: '',          // 用户查询
  intent: '',             // 意图识别结果 (nutrition/fitness/general)
  ragResults: [],         // RAG检索结果
  response: '',           // 最终回复
  metadata: {
    userId: '',
    sessionId: '',
    timestamp: ''
  }
}
```

### 节点设计（Nodes）

#### 1. router_node (路由节点)
- **输入**: userQuery
- **处理**: 调用LLM识别意图
- **输出**: intent (nutrition/fitness/general)
- **复用**: `agents/prompts/router.js`

#### 2. rag_node (检索节点)
- **输入**: userQuery, intent
- **处理**: 
  - 生成query的embedding
  - Qdrant向量检索 (topK=5)
  - Elasticsearch全文检索 (topK=5)
  - 混合检索融合 (RRF算法)
  - Reranker重排序 (topK=3)
- **输出**: ragResults
- **复用**: `rag/index.js` 现有逻辑

#### 3. nutrition_node (营养节点)
- **输入**: userQuery, ragResults
- **处理**: 基于检索结果生成营养建议
- **输出**: response
- **复用**: `agents/prompts/nutrition.js`

#### 4. fitness_node (运动节点)  
- **输入**: userQuery, ragResults
- **处理**: 基于检索结果生成运动建议
- **输出**: response
- **复用**: `agents/prompts/fitness.js`

#### 5. general_node (通用节点)
- **输入**: userQuery
- **处理**: 通用对话（不需要RAG）
- **输出**: response
- **复用**: `agents/prompts/general.js`

### 边设计（Edges）

```
START
  ↓
router_node ──────┐
  ↓               │
  ├─ nutrition? ──┼─→ rag_node → nutrition_node → END
  ├─ fitness? ────┼─→ rag_node → fitness_node → END
  └─ general? ────┘─→ general_node → END
```

### 条件路由逻辑
```javascript
function shouldUseRAG(state) {
  return state.intent === 'nutrition' || state.intent === 'fitness';
}

function routeToAgent(state) {
  switch(state.intent) {
    case 'nutrition': return 'nutrition_node';
    case 'fitness': return 'fitness_node';
    default: return 'general_node';
  }
}
```

## 实施步骤

### Phase 1: 环境准备（15分钟）
- [ ] 安装依赖
  ```bash
  npm install @langchain/langgraph @langchain/core @langchain/openai @langchain/community
  ```
- [ ] 创建新文件 `server-langgraph.js`
- [ ] 创建LangGraph配置文件 `agents/langgraph/`

### Phase 2: 核心Graph构建（30分钟）
- [ ] 定义StateGraph和State接口
- [ ] 创建 router_node
- [ ] 创建 rag_node（包装现有RAG逻辑）
- [ ] 创建 nutrition_node
- [ ] 创建 fitness_node  
- [ ] 创建 general_node
- [ ] 配置条件边和路由逻辑

### Phase 3: LLM集成（20分钟）
- [ ] 配置通义千问LLM（使用OpenAI兼容接口）
  ```javascript
  const llm = new ChatOpenAI({
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: process.env.DASHSCOPE_API_KEY,
    model: 'qwen-plus'
  });
  ```
- [ ] 测试LLM调用
- [ ] 集成Prompt模板

### Phase 4: RAG集成（15分钟）
- [ ] 包装现有RAG服务为LangGraph工具
- [ ] 测试检索功能
- [ ] 验证向量维度匹配（1536维）

### Phase 5: API接口（15分钟）
- [ ] 创建POST /api/chat-langgraph端点
- [ ] 实现流式响应（SSE）
- [ ] 会话历史管理（使用InMemorySaver）
- [ ] 错误处理

### Phase 6: 测试验证（30分钟）
- [ ] 单元测试每个节点
- [ ] 集成测试完整流程
- [ ] 对比测试（新旧版本响应质量）
- [ ] 性能测试（响应时间）

### Phase 7: 前端适配（10分钟）
- [ ] 修改前端API调用路径
- [ ] 测试流式响应显示
- [ ] UI测试

### Phase 8: 部署切换（10分钟）
- [ ] 备份原server.js
- [ ] 切换到server-langgraph.js
- [ ] 监控日志和错误

## 技术难点和解决方案

### 难点1: LLM适配器
**问题**: LangGraph默认用OpenAI，需要适配通义千问
**解决**: 通义千问支持OpenAI兼容模式
```javascript
const llm = new ChatOpenAI({
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.DASHSCOPE_API_KEY,
  model: 'qwen-plus',
  streaming: true
});
```

### 难点2: RAG集成
**问题**: 现有RAG是异步函数，需要包装成LangGraph节点
**解决**: 创建wrapper函数
```javascript
async function rag_node(state) {
  const { userQuery, intent } = state;
  const ragResults = await hybridSearch(userQuery, intent);
  return { ...state, ragResults };
}
```

### 难点3: 状态持久化
**问题**: 会话历史需要跨请求保存
**解决**: 使用LangGraph的MemorySaver或Redis持久化
```javascript
const checkpointer = new MemorySaver();
const graph = workflow.compile({ checkpointer });
```

### 难点4: 流式响应
**问题**: 前端需要实时显示生成内容
**解决**: 使用.stream()方法
```javascript
for await (const chunk of await graph.stream(input, config)) {
  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
}
```

## 关键代码片段

### Graph定义骨架
```javascript
const { StateGraph, END } = require('@langchain/langgraph');
const { ChatOpenAI } = require('@langchain/openai');

// 定义状态
const graphState = {
  messages: { value: (x, y) => x.concat(y), default: () => [] },
  userQuery: { value: null },
  intent: { value: null },
  ragResults: { value: null },
  response: { value: null }
};

// 创建Graph
const workflow = new StateGraph({ channels: graphState });

// 添加节点
workflow.addNode('router', router_node);
workflow.addNode('rag', rag_node);
workflow.addNode('nutrition', nutrition_node);
workflow.addNode('fitness', fitness_node);
workflow.addNode('general', general_node);

// 添加边
workflow.addEdge('START', 'router');
workflow.addConditionalEdges(
  'router',
  shouldUseRAG,
  {
    true: 'rag',
    false: routeToAgent
  }
);
workflow.addConditionalEdges('rag', routeToAgent);
workflow.addEdge('nutrition', END);
workflow.addEdge('fitness', END);
workflow.addEdge('general', END);

// 编译
const app = workflow.compile();
```

## 测试用例

### 测试1: 营养咨询 + RAG
**输入**: "生酮饮食适合减肥吗？"
**预期流程**: router → rag → nutrition
**验证点**:
- [ ] intent识别为'nutrition'
- [ ] RAG返回相关知识（检查"生酮"关键词）
- [ ] 回复包含知识库内容
- [ ] 响应时间 < 3秒

### 测试2: 运动指导 + RAG  
**输入**: "HIIT训练怎么做？"
**预期流程**: router → rag → fitness
**验证点**:
- [ ] intent识别为'fitness'
- [ ] RAG返回HIIT相关知识
- [ ] 回复包含训练步骤
- [ ] 响应时间 < 3秒

### 测试3: 通用对话（无RAG）
**输入**: "你好"
**预期流程**: router → general
**验证点**:
- [ ] intent识别为'general'
- [ ] 不调用RAG
- [ ] 回复友好自然
- [ ] 响应时间 < 2秒

### 测试4: 流式响应
**验证点**:
- [ ] 前端逐字显示
- [ ] SSE连接稳定
- [ ] 无乱码或断流

## 回滚方案

如果LangGraph版本出现问题，立即回滚：
1. 停止新服务: `pm2 stop server-langgraph`
2. 启动旧服务: `pm2 start server.js`
3. 检查日志定位问题
4. 修复后再次尝试

## 成功标准

- ✅ 所有测试用例通过
- ✅ 响应时间 ≤ 原版本
- ✅ 回复质量 ≥ 原版本（人工评估）
- ✅ 无内存泄漏（运行24小时监控）
- ✅ 错误率 < 1%

## 时间估算

**总计**: 约2.5小时
- 开发: 1.5小时
- 测试: 0.5小时  
- 部署: 0.5小时

## 依赖版本

```json
{
  "@langchain/langgraph": "^0.0.20",
  "@langchain/core": "^0.1.50",
  "@langchain/openai": "^0.0.25",
  "@langchain/community": "^0.0.40"
}
```

## 参考资料

- LangGraph.js 官方文档: https://langchain-ai.github.io/langgraphjs/
- 通义千问OpenAI兼容: https://help.aliyun.com/zh/dashscope/developer-reference/compatibility-of-openai-with-dashscope
- LangGraph示例: https://github.com/langchain-ai/langgraphjs/tree/main/examples

## 备注

- **重要**: Qdrant向量维度已修复为1536，知识库已初始化完成（221个向量）
- **重要**: Elasticsearch已有221个文档，无需重建索引
- **重要**: 现有Prompt模板质量很好，可以直接复用
- 建议先在开发环境测试，验证通过后再部署到生产环境
