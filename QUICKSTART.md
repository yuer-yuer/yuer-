# 慢慢瘦 Multi-Agent项目 - 完整启动指南

## 快速启动（5分钟）

### 第一步：安装依赖

```bash
npm install
```

### 第二步：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env
```

编辑 `.env` 文件，填入你的智谱AI API密钥：
```env
ZHIPU_API_KEY=your_zhipu_api_key_here
```

> 获取API密钥：https://open.bigmodel.cn/

### 第三步：初始化知识库

```bash
node scripts/init-knowledge.js
```

这会初始化100+条减重知识到内存中（Elasticsearch和Qdrant可选）。

### 第四步：启动服务

```bash
npm start
```

服务将在 `http://localhost:3000` 启动。

---

## 测试Multi-Agent功能

### 1. 健康检查

```bash
curl http://localhost:3000/api/health
```

应该返回：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 123,
    "memory": {...}
  }
}
```

### 2. 测试意图分类 + Agent对话

#### 测试营养Agent
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"生酮饮食适合减肥吗？\"}"
```

应该返回：
- `intent: "nutrition"`
- `agent: "nutrition_agent"`
- RAG检索到的相关知识
- 专业的营养建议

#### 测试健身Agent
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"HIIT训练怎么做？\"}"
```

应该返回：
- `intent: "fitness"`
- `agent: "fitness_agent"`
- 运动相关的专业建议

#### 测试通用Agent
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"你好，我想减肥\"}"
```

应该返回：
- `intent: "general"`
- `agent: "general_agent"`
- 通用咨询回复

### 3. 测试工具调用

#### 测试计算器工具（BMR计算）
```bash
curl -X POST http://localhost:3000/api/tools/calculate \
  -H "Content-Type: application/json" \
  -d "{
    \"calc_type\": \"bmr\",
    \"gender\": \"male\",
    \"age\": 25,
    \"height\": 175,
    \"weight\": 80
  }"
```

#### 测试食物查询工具
```bash
curl -X POST http://localhost:3000/api/tools/food/query \
  -H "Content-Type: application/json" \
  -d "{
    \"food_name\": \"鸡胸肉\",
    \"amount\": 150
  }"
```

#### 让Agent自动调用工具
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"帮我计算一下，25岁男性，身高175cm，体重80kg的基础代谢率\"}"
```

Agent会自动：
1. 识别为营养相关（nutrition_agent）
2. 提取参数并调用calculator工具
3. 返回计算结果和解释

### 4. 测试会话管理（多轮对话）

#### 第一轮：创建会话并对话
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"我想减肥，但不知道从哪开始\",
    \"userId\": \"test-user\"
  }"
```

记录返回的 `sessionId`。

#### 第二轮：继续对话（带会话ID）
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"那生酮饮食怎么样？\",
    \"userId\": \"test-user\",
    \"sessionId\": \"你的sessionId\"
  }"
```

Agent会记住之前的对话内容。

#### 查看会话信息
```bash
curl http://localhost:3000/api/session/你的sessionId
```

### 5. 测试用户配置系统

#### 创建用户配置
```bash
curl -X POST http://localhost:3000/api/user/profile \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"test-user\",
    \"basicInfo\": {
      \"gender\": \"male\",
      \"age\": 25,
      \"height\": 175,
      \"weight\": 80,
      \"targetWeight\": 70
    },
    \"preferences\": {
      \"dietType\": \"balanced\",
      \"exerciseLevel\": \"beginner\"
    },
    \"goals\": {
      \"primaryGoal\": \"lose_weight\",
      \"weeklyGoal\": 0.5
    }
  }"
```

#### 带用户配置的对话
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"给我制定一个减肥计划\",
    \"userId\": \"test-user\"
  }"
```

Agent会自动读取用户配置，给出个性化建议。

---

## 运行测试套件

```bash
# 测试意图分类
node tests/classifier.test.js

# 测试Agent节点
node tests/nutrition-agent.test.js
node tests/fitness-agent.test.js

# 测试RAG检索
node tests/retriever.test.js

# 测试工具
node tests/calculator.test.js
node tests/food.test.js

# 测试会话管理
node tests/session-manager.test.js

# 测试用户配置
node tests/user-profile.test.js

# 运行所有测试
npm test
```

---

## 完整功能演示脚本

创建测试脚本 `demo.sh`:

```bash
#!/bin/bash

echo "=== 慢慢瘦 Multi-Agent 功能演示 ==="
echo ""

echo "1. 健康检查"
curl -s http://localhost:3000/api/health | jq
echo ""

echo "2. 创建用户配置"
curl -s -X POST http://localhost:3000/api/user/profile \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "basicInfo": {
      "gender": "male",
      "age": 25,
      "height": 175,
      "weight": 80,
      "targetWeight": 70
    }
  }' | jq
echo ""

echo "3. 创建会话"
SESSION_ID=$(curl -s -X POST http://localhost:3000/api/session/create \
  -H "Content-Type: application/json" \
  -d '{"userId": "demo-user"}' | jq -r '.data.sessionId')
echo "Session ID: $SESSION_ID"
echo ""

echo "4. 营养问题（触发营养Agent + RAG）"
curl -s -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"生酮饮食适合减肥吗？\",
    \"userId\": \"demo-user\",
    \"sessionId\": \"$SESSION_ID\"
  }" | jq
echo ""

echo "5. 健身问题（触发健身Agent）"
curl -s -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"HIIT训练怎么做？\",
    \"userId\": \"demo-user\",
    \"sessionId\": \"$SESSION_ID\"
  }" | jq
echo ""

echo "6. 计算问题（触发工具调用）"
curl -s -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"帮我计算基础代谢率\",
    \"userId\": \"demo-user\",
    \"sessionId\": \"$SESSION_ID\"
  }" | jq
echo ""

echo "7. 食物查询（触发工具调用）"
curl -s -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"鸡胸肉100克有多少热量？\",
    \"userId\": \"demo-user\",
    \"sessionId\": \"$SESSION_ID\"
  }" | jq
echo ""

echo "8. 查看会话统计"
curl -s http://localhost:3000/api/session/$SESSION_ID | jq
echo ""

echo "=== 演示完成 ==="
```

运行演示：
```bash
chmod +x demo.sh
./demo.sh
```

---

## 可选：启动完整服务栈（包括ES和Qdrant）

如果你想体验完整的RAG检索（向量+关键词混合），需要启动Elasticsearch和Qdrant。

### 方式1: Docker Compose（推荐）

```bash
# 启动所有服务
docker-compose up -d

# 等待服务启动（约30秒）
sleep 30

# 初始化知识库到ES和Qdrant
docker-compose exec app node scripts/init-knowledge.js

# 查看日志
docker-compose logs -f app
```

### 方式2: 本地安装ES和Qdrant

#### 安装Elasticsearch
```bash
# Windows: 下载并解压 Elasticsearch 8.11
# 启动: bin\elasticsearch.bat
```

#### 安装Qdrant
```bash
# Windows: 使用Docker
docker run -p 6333:6333 qdrant/qdrant:v1.7.4
```

#### 配置环境变量
```env
ES_NODE=http://localhost:9200
QDRANT_URL=http://localhost:6333
```

#### 初始化知识库
```bash
node scripts/init-knowledge.js
```

---

## 功能验证清单

- [ ] ✅ 服务启动成功（端口3000）
- [ ] ✅ 健康检查通过
- [ ] ✅ 意图分类正确（nutrition/fitness/general）
- [ ] ✅ 营养Agent回答准确
- [ ] ✅ 健身Agent回答准确
- [ ] ✅ 通用Agent回答友好
- [ ] ✅ RAG检索返回相关知识
- [ ] ✅ 工具自动调用成功（计算器/食物查询）
- [ ] ✅ 会话管理正常（历史记忆）
- [ ] ✅ 用户配置生效（个性化回复）
- [ ] ✅ 所有测试通过

---

## 故障排查

### 问题1: 服务启动失败

**症状**: `npm start` 报错

**解决**:
```bash
# 检查环境变量
node -e "console.log(process.env.ZHIPU_API_KEY)"

# 检查端口占用
netstat -ano | findstr :3000

# 查看详细错误
node server.js
```

### 问题2: Agent不回复

**症状**: API返回但reply为空

**解决**:
1. 检查ZHIPU_API_KEY是否正确
2. 检查网络连接
3. 查看日志 `logs/app-*.log`

### 问题3: RAG检索无结果

**症状**: `knowledgeUsed: 0`

**解决**:
```bash
# 重新初始化知识库
node scripts/init-knowledge.js

# 检查内存搜索是否工作
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "减肥"}'
```

### 问题4: 工具调用失败

**症状**: Agent回复中没有调用工具

**解决**:
- 确保提问明确需要计算或查询
- 例如："帮我计算BMR"、"鸡胸肉热量是多少"

---

## 下一步

项目已完整启动，你可以：

1. **开发前端界面**: 调用REST API创建Web或移动端界面
2. **集成到应用**: 将Multi-Agent系统集成到现有应用
3. **添加新Agent**: 参考现有Agent添加新的专业领域
4. **扩展工具**: 添加更多实用工具
5. **优化提示词**: 调整Agent的系统提示词提升效果

---

**项目已就绪！开始体验Multi-Agent + RAG的强大能力吧！** 🚀
