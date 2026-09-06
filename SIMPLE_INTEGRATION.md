# Multi-Agent 集成 - 最简单的方式

## 当前状态

✅ Multi-Agent代码已完成（agents/、rag/、tools/、session/）
✅ 后端已部分集成（/api/agent/chat 接口可用）
❌ 前端尚未连接到Multi-Agent系统

## 最简单的集成方案

**直接使用已存在的 `/api/agent/chat` 接口**，无需修改 `/api/ai/coach-chat`。

---

## 步骤1: 测试Multi-Agent API是否工作

```bash
# 测试营养问题
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "蛋白质每天要吃多少？", "userId": "test"}'

# 测试健身问题
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "HIIT训练怎么做？", "userId": "test"}'

# 测试强制指定Agent
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好", "userId": "test", "forceAgent": "nutrition_agent"}'
```

如果返回类似这样的结果就说明工作了：
```json
{
  "reply": "...",
  "intent": "nutrition",
  "agent": "nutrition_agent",
  "knowledgeUsed": 3,
  "sessionId": "xxx",
  "duration": 1500,
  "error": false
}
```

---

## 步骤2: 修改前端调用Multi-Agent

找到前端的AI私教对话代码（应该在 `public/js/` 目录下），修改API调用：

### 原来的代码可能是这样：
```javascript
fetch('/api/ai/coach-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, history })
})
```

### 改成：
```javascript
fetch('/api/agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    message, 
    userId: 'your-user-id',
    sessionId: currentSessionId, // 保存会话ID
    forceAgent: selectedAgent // 'nutrition_agent', 'fitness_agent', 或 null
  })
})
```

---

## 步骤3: 前端添加Agent选择器（可选）

在AI私教页面添加3个按钮：

```html
<div class="agent-selector">
  <button onclick="selectAgent(null)" class="active">🤖 智能路由</button>
  <button onclick="selectAgent('nutrition_agent')">🥗 营养专家</button>
  <button onclick="selectAgent('fitness_agent')">💪 健身教练</button>
</div>
```

```javascript
let selectedAgent = null;
let currentSessionId = null;

function selectAgent(agent) {
  selectedAgent = agent;
  currentSessionId = null; // 切换Agent时重置会话
  // 更新按钮样式
  document.querySelectorAll('.agent-selector button').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
}

async function sendMessage(message) {
  const response = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      userId: currentUser.id,
      sessionId: currentSessionId,
      forceAgent: selectedAgent
    })
  });
  
  const data = await response.json();
  currentSessionId = data.sessionId; // 保存会话ID
  
  // 显示回复
  displayMessage(data.reply, {
    agent: data.agent,
    knowledgeUsed: data.knowledgeUsed
  });
}

function displayMessage(reply, meta) {
  const agentName = {
    'nutrition_agent': '🥗 营养专家',
    'fitness_agent': '💪 健身教练',
    'general_agent': '🤖 小瘦'
  }[meta.agent] || '🤖 小瘦';
  
  const html = `
    <div class="message assistant">
      <div class="agent-badge">${agentName}</div>
      ${meta.knowledgeUsed > 0 ? `<div class="knowledge-badge">📚 ${meta.knowledgeUsed}条知识</div>` : ''}
      <div class="content">${reply}</div>
    </div>
  `;
  
  document.getElementById('chatMessages').innerHTML += html;
}
```

---

## 步骤4: 添加样式（可选）

```css
.agent-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.agent-selector button {
  flex: 1;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 14px;
}

.agent-selector button:hover {
  border-color: #4CAF50;
}

.agent-selector button.active {
  border-color: #4CAF50;
  background: #4CAF50;
  color: white;
}

.agent-badge {
  font-size: 12px;
  font-weight: bold;
  color: #666;
  margin-bottom: 5px;
}

.knowledge-badge {
  font-size: 12px;
  background: #FFF9C4;
  color: #F57F17;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 5px;
}
```

---

## 快速验证

1. **后端测试**：运行上面的curl命令，确认API返回正确
2. **前端测试**：修改前端代码后，刷新页面，发送消息测试

---

## 如果遇到问题

### 问题1: API返回error
- 检查日志 `logs/error-*.log`
- 确认智谱API密钥正确

### 问题2: knowledgeUsed总是0
- 正常，知识库初始化需要时间
- 或者ES/Qdrant未启动（会自动降级到内存模式）

### 问题3: 前端找不到文件
- 检查 `public/js/` 目录
- 查找包含 `/api/ai/coach-chat` 的文件

---

## 最小改动方案

**如果你只想快速测试Multi-Agent功能**，可以：

1. 打开浏览器控制台（F12）
2. 在AI私教页面执行：

```javascript
// 测试Multi-Agent
async function testAgent() {
  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: '生酮饮食适合减肥吗？',
      userId: 'test'
    })
  });
  const data = await res.json();
  console.log('Agent回复:', data);
}

testAgent();
```

查看控制台输出，如果看到 `intent`, `agent`, `knowledgeUsed` 等字段，说明Multi-Agent系统工作正常！

---

## 需要我帮你做什么？

A. 帮我找到前端的AI对话代码位置
B. 直接修改前端代码集成Multi-Agent
C. 先用curl测试API是否工作
D. 其他

告诉我选哪个，我立即执行！
