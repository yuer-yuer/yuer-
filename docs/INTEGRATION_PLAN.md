# Multi-Agent集成方案

## 集成目标

将新开发的Multi-Agent + RAG系统集成到现有的"慢慢瘦"PWA应用中，让用户可以：
1. 在AI私教界面选择不同的Agent（营养、健身、通用）
2. 享受RAG增强的专业回答
3. 使用工具调用功能（计算器、食物查询）
4. 保留会话历史和用户上下文

## 当前状态

### 现有AI接口
- `/api/ai/coach-chat` - 原有的AI私教接口（简单的智谱API调用）
- `/api/agent/chat` - 新开发的Multi-Agent接口（已集成但未启用）

### 已完成的Multi-Agent组件
- ✅ `agents/` - 意图分类器 + 3个专业Agent
- ✅ `rag/` - 混合检索系统
- ✅ `tools/` - 工具系统
- ✅ `session/` - 会话管理
- ✅ `routes/api.js` - REST API

## 集成步骤

### 步骤1: 启用Multi-Agent接口（后端）

**方法A - 替换原有接口（推荐）**:
修改 `/api/ai/coach-chat` 接口，使用Multi-Agent系统：

```javascript
// 在 server.js 第1043行附近
app.post('/api/ai/coach-chat', requireAuth, async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json(err(400, '请输入要和小瘦说的话'));

  try {
    // 使用Multi-Agent系统
    const result = await agentGraph.invoke({
      message,
      userId: req.session.userId,
      sessionId: req.body.sessionId, // 前端传入
    });

    // 自动保存会话
    sessionManager.addMessage(result.sessionId, 'user', message);
    sessionManager.addMessage(result.sessionId, 'assistant', result.reply, {
      intent: result.intent,
      agent: result.agent,
    });

    res.json(ok({
      reply: result.reply,
      intent: result.intent,
      agent: result.agent,
      sessionId: result.sessionId,
      knowledgeUsed: result.knowledgeUsed,
      provider: 'multi-agent',
    }));
  } catch (e) {
    console.error('Multi-Agent chat failed:', e);
    // 降级到原有逻辑
    const local = buildLocalCoachReply(message, snapshot).content;
    res.json(ok({
      reply: local,
      provider: 'local-fallback',
    }));
  }
});
```

**方法B - 保留两个接口**:
- `/api/ai/coach-chat` - 保留原有简单对话
- `/api/agent/chat` - 使用Multi-Agent（已存在）

### 步骤2: 修改前端UI

#### 2.1 添加Agent选择器

在 `public/js/app.js` 的AI私教页面添加Agent选择：

```javascript
// AI私教页面HTML
const coachPageHTML = `
  <div class="coach-page">
    <!-- Agent选择器 -->
    <div class="agent-selector">
      <button class="agent-btn active" data-agent="auto">
        🤖 智能路由
      </button>
      <button class="agent-btn" data-agent="nutrition">
        🥗 营养专家
      </button>
      <button class="agent-btn" data-agent="fitness">
        💪 健身教练
      </button>
    </div>

    <!-- 对话区域 -->
    <div class="chat-messages" id="chatMessages"></div>

    <!-- 输入区域 -->
    <div class="chat-input-area">
      <input type="text" id="coachInput" placeholder="和小瘦聊聊...">
      <button id="sendBtn">发送</button>
    </div>
  </div>
`;
```

#### 2.2 添加Agent选择逻辑

```javascript
// Agent选择
let selectedAgent = 'auto'; // auto表示自动路由
let currentSessionId = null;

document.querySelectorAll('.agent-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.agent-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedAgent = btn.dataset.agent;
    
    // 切换Agent时创建新会话
    currentSessionId = null;
  });
});
```

#### 2.3 修改对话发送逻辑

```javascript
async function sendMessage(message) {
  try {
    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        userId: currentUserId,
        sessionId: currentSessionId,
        forceAgent: selectedAgent !== 'auto' ? selectedAgent : null
      })
    });

    const data = await response.json();
    
    if (data.success) {
      currentSessionId = data.sessionId; // 保存会话ID
      
      // 显示回复
      displayMessage('assistant', data.reply, {
        intent: data.intent,
        agent: data.agent,
        knowledgeUsed: data.knowledgeUsed
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
  }
}

function displayMessage(role, content, meta) {
  const messagesDiv = document.getElementById('chatMessages');
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}`;
  
  // 显示Agent信息
  if (role === 'assistant' && meta) {
    const agentInfo = document.createElement('div');
    agentInfo.className = 'agent-info';
    agentInfo.innerHTML = `
      <span class="agent-badge ${meta.agent}">${getAgentName(meta.agent)}</span>
      ${meta.knowledgeUsed > 0 ? `<span class="knowledge-badge">📚 ${meta.knowledgeUsed}条知识</span>` : ''}
    `;
    msgDiv.appendChild(agentInfo);
  }
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;
  msgDiv.appendChild(contentDiv);
  
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function getAgentName(agent) {
  const names = {
    'nutrition_agent': '🥗 营养专家',
    'fitness_agent': '💪 健身教练',
    'general_agent': '🤖 小瘦'
  };
  return names[agent] || '🤖 小瘦';
}
```

### 步骤3: 添加样式

在 `public/css/style.css` 添加：

```css
/* Agent选择器 */
.agent-selector {
  display: flex;
  gap: 10px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 10px;
  margin-bottom: 20px;
}

.agent-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.agent-btn:hover {
  border-color: #4CAF50;
  transform: translateY(-2px);
}

.agent-btn.active {
  border-color: #4CAF50;
  background: #4CAF50;
  color: white;
}

/* 消息样式 */
.message {
  margin: 15px 0;
  padding: 12px;
  border-radius: 8px;
}

.message.user {
  background: #E3F2FD;
  text-align: right;
}

.message.assistant {
  background: #F5F5F5;
}

/* Agent信息徽章 */
.agent-info {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}

.agent-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
}

.agent-badge.nutrition_agent {
  background: #FFF3E0;
  color: #F57C00;
}

.agent-badge.fitness_agent {
  background: #E8F5E9;
  color: #388E3C;
}

.agent-badge.general_agent {
  background: #E3F2FD;
  color: #1976D2;
}

.knowledge-badge {
  padding: 4px 8px;
  border-radius: 4px;
  background: #FFF9C4;
  color: #F57F17;
}

/* 对话区域 */
.chat-messages {
  height: 400px;
  overflow-y: auto;
  padding: 15px;
  background: white;
  border-radius: 10px;
  margin-bottom: 15px;
}

.chat-input-area {
  display: flex;
  gap: 10px;
}

.chat-input-area input {
  flex: 1;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
}

.chat-input-area button {
  padding: 12px 24px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}

.chat-input-area button:hover {
  background: #45a049;
}
```

### 步骤4: 支持强制Agent选择（后端）

修改 `/api/agent/chat` 接口支持强制指定Agent：

```javascript
app.post('/api/agent/chat', async (req, res) => {
  const { message, userId, sessionId, forceAgent } = req.body;
  
  // 创建或获取会话
  let activeSessionId = sessionId;
  if (sessionId) {
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      const newSession = sessionManager.createSession(userId || 'anonymous');
      activeSessionId = newSession.sessionId;
    }
  } else {
    const newSession = sessionManager.createSession(userId || 'anonymous');
    activeSessionId = newSession.sessionId;
  }
  
  sessionManager.addMessage(activeSessionId, 'user', message);
  
  // 调用Multi-Agent，支持强制Agent
  const result = await agentGraph.invoke({
    message,
    userId: userId || req.session?.userId || 'anonymous',
    sessionId: activeSessionId,
    forceAgent, // 'nutrition_agent', 'fitness_agent', 或 null（自动路由）
  });
  
  sessionManager.addMessage(activeSessionId, 'assistant', result.reply, {
    intent: result.intent,
    agent: result.agent,
  });
  
  res.json({ ...result, sessionId: activeSessionId });
});
```

修改 `agents/graph.js` 支持强制Agent：

```javascript
async function classifyIntentNode(state) {
  // 如果指定了强制Agent，直接使用
  if (state.forceAgent) {
    return {
      ...state,
      intent: state.forceAgent.replace('_agent', ''), // nutrition_agent -> nutrition
    };
  }
  
  // 否则使用分类器自动识别
  return await classifyIntent(state);
}
```

## 功能展示

### 用户体验流程

1. **打开AI私教页面**
   - 看到3个Agent选择按钮：🤖智能路由、🥗营养专家、💪健身教练

2. **选择Agent或使用智能路由**
   - 点击"营养专家" → 所有对话都会路由到营养Agent
   - 保持"智能路由" → 系统根据问题内容自动选择最合适的Agent

3. **开始对话**
   - 用户: "生酮饮食适合减肥吗？"
   - 系统: 显示 [🥗 营养专家] [📚 3条知识] + 专业回答

4. **查看Agent工作**
   - 每条回复显示是哪个Agent回答
   - 显示使用了多少条知识库内容
   - 如果调用了工具（计算BMR等），会在回复中体现

5. **会话记忆**
   - 后续对话会记住之前的内容
   - 自动注入用户的个人信息（年龄、体重等）

## 测试步骤

### 1. 测试Multi-Agent API

```bash
# 测试自动路由
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "生酮饮食适合减肥吗？", "userId": "test"}'

# 测试强制营养Agent
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好", "userId": "test", "forceAgent": "nutrition_agent"}'
```

### 2. 测试前端界面

1. 访问 `http://localhost:3000`
2. 登录账号
3. 进入"AI私教"页面
4. 选择不同的Agent
5. 发送消息测试

## 优势

✅ **无缝集成**: 不破坏现有功能，只增强AI对话部分
✅ **用户体验**: 可以选择专业Agent或让系统自动选择
✅ **渐进增强**: 如果Multi-Agent失败，自动降级到原有逻辑
✅ **保留数据**: 用户数据、饮食记录等完全兼容
✅ **专业回答**: RAG增强，答案更准确专业

## 下一步

需要我帮你：
1. ✅ 修改后端代码，集成Multi-Agent？
2. ✅ 修改前端代码，添加Agent选择器？
3. ✅ 测试完整流程？

选择一个，我立即开始实施！
