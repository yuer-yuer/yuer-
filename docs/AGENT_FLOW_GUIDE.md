# Multi-Agent + RAG 完整功能流程说明

## 📚 目录
1. [系统架构概览](#系统架构概览)
2. [完整对话流程](#完整对话流程)
3. [如何切换Agent](#如何切换agent)
4. [RAG知识检索流程](#rag知识检索流程)
5. [工具调用流程](#工具调用流程)
6. [实际使用示例](#实际使用示例)

---

## 系统架构概览

```
用户输入
   ↓
前端 (public/js/app.js)
   ↓
API接口 (/api/agent/chat)
   ↓
Agent Graph (agents/graph.js)
   ↓
┌─────────────────────────────────┐
│  1. 意图分类 (classifier.js)    │
│     - nutrition (营养问题)      │
│     - fitness (健身问题)        │
│     - general (通用问题)        │
└─────────────────────────────────┘
   ↓
┌─────────────────────────────────┐
│  2. 路由到专业Agent              │
│     - nutrition_agent           │
│     - fitness_agent             │
│     - general_agent             │
└─────────────────────────────────┘
   ↓
┌─────────────────────────────────┐
│  3. Agent处理                    │
│     - 读取会话历史               │
│     - 读取用户配置               │
│     - RAG知识检索               │
│     - 调用工具（可选）           │
│     - 生成回复                   │
└─────────────────────────────────┘
   ↓
返回结果给用户
```

---

## 完整对话流程

### 流程图

```
用户: "生酮饮食适合减肥吗？"
   ↓
[前端] public/js/app.js
   • 调用 /api/agent/chat
   • 传递: { message, userId, sessionId, forceAgent }
   ↓
[后端] server.js
   • 获取/创建会话
   • 保存用户消息
   ↓
[Agent系统] agents/graph.js
   ↓
┌──────────────────────────────────────┐
│ 步骤1: 意图分类                       │
│ agents/nodes/classifier.js            │
│                                       │
│ 输入: "生酮饮食适合减肥吗？"           │
│ 处理: 调用LLM分析意图                 │
│ 输出: intent = "nutrition"            │
└──────────────────────────────────────┘
   ↓
┌──────────────────────────────────────┐
│ 步骤2: 路由到营养Agent                │
│ agents/nodes/nutrition.js             │
│                                       │
│ 2.1 读取会话历史                      │
│     - 获取最近10条对话                │
│                                       │
│ 2.2 读取用户信息                      │
│     - 年龄、性别、体重等               │
│                                       │
│ 2.3 RAG知识检索                       │
│     rag/retriever.js                  │
│     ├─ 向量搜索 (Qdrant)              │
│     ├─ 关键词搜索 (Elasticsearch)     │
│     └─ 混合结果                       │
│     结果: 找到3条关于生酮饮食的知识    │
│                                       │
│ 2.4 调用工具（可选）                  │
│     - 计算器工具                      │
│     - 食物查询工具                    │
│                                       │
│ 2.5 构建提示词                        │
│     系统提示 + 用户信息 + 知识库 + 对话历史
│                                       │
│ 2.6 调用LLM生成回复                   │
│     llm/zhipu.js                      │
│     使用智谱AI GLM-4-Flash            │
└──────────────────────────────────────┘
   ↓
┌──────────────────────────────────────┐
│ 步骤3: 返回结果                       │
│                                       │
│ {                                     │
│   reply: "生酮饮食确实可以用于减肥...", │
│   intent: "nutrition",                │
│   agent: "nutrition_agent",           │
│   knowledgeUsed: 3,                   │
│   sessionId: "xxx-xxx-xxx",           │
│   duration: 1500                      │
│ }                                     │
└──────────────────────────────────────┘
   ↓
[前端] 显示回复
   • 显示Agent名称: 🥗 营养专家
   • 显示知识使用: 📚 3条知识
   • 显示回复内容
```

---

## 如何切换Agent

### 方式1: 自动路由（默认）

**工作原理**：系统自动分析用户问题，路由到最合适的Agent

**示例**：
```javascript
// 前端调用
fetch('/api/agent/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: "生酮饮食适合减肥吗？",
    userId: "user123",
    // 不传 forceAgent，系统自动分类
  })
})

// 系统判断：这是营养问题 → 路由到 nutrition_agent
```

**分类规则**（agents/nodes/classifier.js）：
- 包含"饮食/热量/蛋白质/碳水/脂肪/营养" → `nutrition`
- 包含"运动/训练/健身/HIIT/力量" → `fitness`
- 其他 → `general`

---

### 方式2: 强制指定Agent

**工作原理**：用户手动选择Agent，跳过意图分类

**示例**：
```javascript
// 前端调用
fetch('/api/agent/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: "你好",
    userId: "user123",
    forceAgent: "nutrition_agent" // 强制使用营养Agent
  })
})

// 系统跳过分类，直接使用 nutrition_agent
```

**可用的Agent值**：
- `"nutrition_agent"` - 营养专家
- `"fitness_agent"` - 健身教练
- `"general_agent"` - 通用助手
- `null` 或不传 - 自动路由

---

### 方式3: 前端UI切换（需要添加）

#### 步骤1: 添加Agent选择器UI

在 `public/js/app.js` 中找到AI私教页面渲染函数，添加：

```javascript
function renderAiCoachPage() {
  return `
    <div class="ai-coach-page">
      <!-- Agent选择器 -->
      <div class="agent-selector">
        <button 
          class="agent-btn ${!AppState.aiCoach.selectedAgent ? 'active' : ''}" 
          onclick="selectAgent(null)">
          🤖 智能路由
        </button>
        <button 
          class="agent-btn ${AppState.aiCoach.selectedAgent === 'nutrition_agent' ? 'active' : ''}" 
          onclick="selectAgent('nutrition_agent')">
          🥗 营养专家
        </button>
        <button 
          class="agent-btn ${AppState.aiCoach.selectedAgent === 'fitness_agent' ? 'active' : ''}" 
          onclick="selectAgent('fitness_agent')">
          💪 健身教练
        </button>
      </div>

      <!-- 对话区域 -->
      <div id="ai-coach-messages" class="chat-messages"></div>
      
      <!-- 输入区域 -->
      <div class="chat-input-area">
        <input type="text" id="ai-coach-input" placeholder="和小瘦聊聊...">
        <button onclick="sendAiCoachMessage()">发送</button>
      </div>
    </div>
  `;
}
```

#### 步骤2: 添加切换逻辑

```javascript
// 初始化Agent状态
if (!AppState.aiCoach.selectedAgent) {
  AppState.aiCoach.selectedAgent = null; // null表示自动路由
}

// Agent切换函数
function selectAgent(agent) {
  AppState.aiCoach.selectedAgent = agent;
  AppState.aiCoach.sessionId = null; // 切换Agent时重置会话
  
  // 显示提示
  const agentName = {
    null: '智能路由模式',
    'nutrition_agent': '营养专家模式',
    'fitness_agent': '健身教练模式'
  }[agent];
  
  showToast(`已切换到${agentName}`);
  
  // 重新渲染页面更新按钮状态
  renderCurrentPage();
}
```

#### 步骤3: 修改发送消息函数（已完成）

```javascript
async function streamAiCoachReply(message, history, onChunk) {
  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      message,
      userId: AppState.userId || 'anonymous',
      sessionId: AppState.aiCoach.sessionId || null,
      forceAgent: AppState.aiCoach.selectedAgent || null // 传递选择的Agent
    }),
  });
  // ... 其他代码
}
```

#### 步骤4: 添加CSS样式

在 `public/css/style.css` 添加：

```css
/* Agent选择器 */
.agent-selector {
  display: flex;
  gap: 10px;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px 12px 0 0;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.agent-btn {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.agent-btn:hover {
  background: rgba(255,255,255,0.2);
  border-color: rgba(255,255,255,0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.agent-btn.active {
  background: white;
  color: #667eea;
  border-color: white;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(255,255,255,0.3);
}

.agent-btn:active {
  transform: translateY(0);
}
```

---

## RAG知识检索流程

### 详细流程

```
1. Agent收到问题
   ↓
2. 提取关键词
   message: "生酮饮食适合减肥吗？"
   keywords: ["生酮", "饮食", "减肥"]
   ↓
3. 并行检索
   ┌─────────────────────────────┐
   │ 向量搜索 (Qdrant)            │
   │ - 将问题转为向量              │
   │ - 在向量库中找相似内容        │
   │ - 返回Top 5相关文档          │
   └─────────────────────────────┘
                +
   ┌─────────────────────────────┐
   │ 关键词搜索 (Elasticsearch)   │
   │ - 使用中文分词                │
   │ - 匹配关键词                  │
   │ - 返回Top 5相关文档          │
   └─────────────────────────────┘
   ↓
4. 混合排序
   - 向量结果权重: 0.6
   - 关键词结果权重: 0.4
   - 合并去重
   ↓
5. 返回Top 3结果
   [
     { content: "生酮饮食是...", score: 0.85 },
     { content: "减肥原理...", score: 0.78 },
     { content: "注意事项...", score: 0.72 }
   ]
   ↓
6. 注入到提示词
   "以下是相关知识：
   1. 生酮饮食是...
   2. 减肥原理...
   3. 注意事项...
   
   用户问题：生酮饮食适合减肥吗？
   请基于上述知识回答。"
   ↓
7. LLM生成回复
```

### 代码实现位置

**RAG检索器**：`rag/retriever.js`
```javascript
async retrieve(query, options = {}) {
  const { topK = 5 } = options;
  
  // 1. 向量搜索
  const vectorResults = await this.qdrant.search(query, topK);
  
  // 2. 关键词搜索
  const keywordResults = await this.elasticsearch.search(query, topK);
  
  // 3. 混合排序
  const combined = this.mergeResults(vectorResults, keywordResults);
  
  return combined.slice(0, topK);
}
```

**Agent中使用**：`agents/nodes/nutrition.js`
```javascript
// RAG检索
const knowledge = await retriever.retrieve(message, { topK: 3 });

// 构建提示词
const prompt = `
你是营养专家。

相关知识：
${knowledge.map(k => k.content).join('\n\n')}

用户问题：${message}

请基于以上知识回答。
`;
```

---

## 工具调用流程

### 流程图

```
用户: "帮我计算一下BMR"
   ↓
Agent识别需要调用工具
   ↓
提示词引导LLM输出JSON格式
   "如需计算，请输出：
   {"tool": "calculator", "params": {...}}"
   ↓
LLM回复包含工具调用
   "好的，我来帮你计算。
   {"tool": "calculator", "calc_type": "bmr", ...}"
   ↓
Agent解析工具调用
   ↓
执行工具
   tools/calculator.js
   ↓
获得结果
   { bmr: 1650, tdee: 2280 }
   ↓
注入结果到新的提示词
   "工具执行结果：BMR=1650, TDEE=2280
   请用通俗语言解释给用户。"
   ↓
LLM生成最终回复
   "根据你的身体数据，你的基础代谢率是1650大卡/天..."
```

### 可用工具

**1. 计算器工具** (`tools/calculator.js`)
```javascript
// BMR计算
calculator.calculate({
  calc_type: 'bmr',
  gender: 'male',
  age: 25,
  height: 175,
  weight: 80
});
// → { bmr: 1650 }

// TDEE计算
calculator.calculate({
  calc_type: 'tdee',
  bmr: 1650,
  activity_level: 'moderate'
});
// → { tdee: 2280 }
```

**2. 食物查询工具** (`tools/food.js`)
```javascript
food.query({
  food_name: '鸡胸肉',
  amount: 100
});
// → {
//   name: '鸡胸肉',
//   calories: 133,
//   protein: 31,
//   carbs: 0,
//   fat: 1.2
// }
```

**3. 知识库工具** (`tools/knowledge.js`)
```javascript
knowledge.search({
  query: '生酮饮食'
});
// → [ {...知识1...}, {...知识2...} ]
```

---

## 实际使用示例

### 示例1: 营养咨询（自动路由）

**用户输入**：
```
"我想了解生酮饮食，适合减肥吗？"
```

**系统处理**：
```javascript
// 1. 意图分类
classifier → intent: "nutrition"

// 2. 路由到营养Agent
nutrition_agent.process({
  message: "我想了解生酮饮食，适合减肥吗？",
  userId: "user123",
  sessionId: null
})

// 3. RAG检索
retriever.retrieve("生酮饮食 减肥") 
→ 找到3条相关知识

// 4. 生成回复
llm.generate({
  system: "你是营养专家...",
  knowledge: "生酮饮食知识1、2、3...",
  user: "我想了解生酮饮食，适合减肥吗？"
})
```

**返回结果**：
```json
{
  "reply": "生酮饮食确实可以用于减肥...",
  "intent": "nutrition",
  "agent": "nutrition_agent",
  "knowledgeUsed": 3,
  "sessionId": "abc-123-xyz",
  "duration": 1800
}
```

**前端显示**：
```
┌─────────────────────────────────┐
│ 🥗 营养专家 📚 3条知识            │
│                                 │
│ 生酮饮食确实可以用于减肥...      │
│                                 │
└─────────────────────────────────┘
```

---

### 示例2: 健身咨询（强制Agent）

**用户切换到健身教练模式**：
```javascript
selectAgent('fitness_agent');
```

**用户输入**：
```
"你好"
```

**系统处理**：
```javascript
// 跳过意图分类，直接使用 fitness_agent
fitness_agent.process({
  message: "你好",
  userId: "user123",
  forceAgent: "fitness_agent"
})
```

**返回结果**：
```json
{
  "reply": "你好！我是你的健身教练，准备好开始训练了吗？...",
  "intent": "fitness",
  "agent": "fitness_agent",
  "knowledgeUsed": 0,
  "sessionId": "def-456-xyz"
}
```

---

### 示例3: 带工具调用

**用户输入**：
```
"我25岁，男性，175cm，80kg，帮我算一下BMR和TDEE"
```

**系统处理**：
```javascript
// 1. 路由到营养Agent
nutrition_agent

// 2. Agent识别需要计算
// 提示词引导LLM输出工具调用

// 3. LLM回复
{
  "tool": "calculator",
  "calc_type": "bmr_tdee",
  "gender": "male",
  "age": 25,
  "height": 175,
  "weight": 80,
  "activity_level": "moderate"
}

// 4. 执行工具
calculator.calculate(...)
→ { bmr: 1742, tdee: 2404 }

// 5. 再次调用LLM解释结果
"根据你的数据：
BMR: 1742大卡/天
TDEE: 2404大卡/天
..."
```

---

### 示例4: 多轮对话（会话记忆）

**第一轮**：
```
用户: "我想减肥"
系统: "好的，你的目标是减重多少呢？"
sessionId: "xxx-111"
```

**第二轮**（使用相同sessionId）：
```
用户: "10公斤"
系统读取历史:
  - 用户说"我想减肥"
  - 我问"目标减重多少"
  - 用户回答"10公斤"

系统: "明白了，10公斤的目标需要科学规划。根据你的情况..."
sessionId: "xxx-111"
```

---

## 快速测试

### 测试1: 自动路由
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "生酮饮食适合减肥吗？",
    "userId": "test"
  }'
```

### 测试2: 强制营养Agent
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好",
    "userId": "test",
    "forceAgent": "nutrition_agent"
  }'
```

### 测试3: 多轮对话
```bash
# 第一轮
RESULT=$(curl -s -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "我想减肥", "userId": "test"}')

SESSION_ID=$(echo $RESULT | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)

# 第二轮（使用相同sessionId）
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"需要多久？\",
    \"userId\": \"test\",
    \"sessionId\": \"$SESSION_ID\"
  }"
```

---

## 总结

### Multi-Agent系统特点

✅ **智能路由**：自动识别意图，选择最合适的Agent  
✅ **专业回答**：3个领域专家，各司其职  
✅ **知识增强**：RAG检索相关知识，回答更准确  
✅ **工具调用**：自动计算BMR/TDEE、查询食物热量  
✅ **会话记忆**：记住对话历史，支持多轮交互  
✅ **灵活切换**：支持自动路由和手动选择Agent  
✅ **降级策略**：失败时自动回退，保证可用性  

### 使用方式

1. **默认使用**：什么都不做，系统自动工作
2. **手动切换**：添加UI选择器，让用户选择Agent
3. **API调用**：通过forceAgent参数指定Agent

---

**文档版本**: v1.0  
**更新时间**: 2026-09-03  
**系统状态**: ✅ 运行中
