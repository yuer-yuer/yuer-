# 慢慢瘦 - 从零启动完整指南

## 🎯 项目说明

这个项目包含两个独立的系统：

1. **Multi-Agent + RAG 系统**（新开发）：纯后端API服务，提供智能对话功能
2. **慢慢瘦 PWA应用**（原有）：包含前端界面，提供饮食记录、运动管理等功能

---

## 📋 前置要求

### 必需软件
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0

### 可选软件（用于完整RAG功能）
- **Elasticsearch**: 8.x（关键词搜索）
- **Qdrant**: 1.7.x（向量搜索）
- **Redis**: 7.x（缓存）
- **Docker**: 如果使用容器化部署

> **注意**: Elasticsearch、Qdrant、Redis均为可选。系统会自动降级到内存模式。

---

## 🚀 方式一：快速启动（基础模式，5分钟）

### 步骤1：安装依赖

```bash
cd "d:\科林冲刺\项目班\AI\AIcode\慢慢瘦"
npm install
```

### 步骤2：配置环境变量

你的`.env`文件已经配置好了：
```env
AI_PROVIDER=zhipu
ZHIPU_API_KEY=43a44214cdbf4577920861b1fdd369b9.u6QBMf35xMn76HKl
ZHIPU_MODEL=glm-4v-flash
```

**这个配置已经足够！** 系统会使用内存模式运行RAG。

### 步骤3：启动服务

```bash
npm start
```

或者使用：
```bash
node server.js
```

### 步骤4：访问应用

**前端界面**:
```
http://localhost:3000
```

**Multi-Agent API**:
```
http://localhost:3000/api/agent/chat
```

**健康检查**:
```
http://localhost:3000/api/health
```

---

## 🎨 前端界面说明

启动服务后，在浏览器访问 `http://localhost:3000`，你会看到：

### 主要功能页面
1. **首页** - 今日摄入/消耗概览
2. **饮食记录** - 记录三餐，查看热量
3. **AI拍照识别** - 拍照识别食物和热量
4. **我能吃吗** - 食物预算推演
5. **运动记录** - 记录运动消耗
6. **AI私教"小瘦"** - 智能对话（Multi-Agent）
7. **今日计划** - 任务清单
8. **个人中心** - 体重目标、BMI/BMR

### 前端技术栈
- 原生 HTML/CSS/JavaScript
- PWA（可安装到桌面）
- Service Worker（离线缓存）

### 前端代码位置
```
public/
├── index.html          # 主页面
├── css/               # 样式文件
├── js/
│   ├── app.js         # 主应用逻辑
│   ├── charts.js      # 图表
│   └── ...
├── images/            # 图片资源
├── manifest.webmanifest  # PWA配置
└── sw.js              # Service Worker
```

---

## 🤖 Multi-Agent API使用示例

### 测试对话API

```bash
# 测试AI对话
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "生酮饮食适合减肥吗？"}'

# 创建会话
curl -X POST http://localhost:3000/api/session/create \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'

# 计算BMR
curl -X POST http://localhost:3000/api/tools/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "calc_type": "bmr",
    "gender": "male",
    "age": 25,
    "height": 175,
    "weight": 80
  }'
```

### JavaScript前端调用示例

```javascript
// 调用AI对话
async function chatWithAgent(message) {
  const response = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  const data = await response.json();
  console.log(data.reply);
}

chatWithAgent('我想减肥');
```

---

## 🐳 方式二：Docker完整部署（包含ES、Qdrant、Redis）

### 前置条件
需要安装Docker和docker-compose。

### 步骤1：配置环境变量

确认`.env`文件包含：
```env
ZHIPU_API_KEY=43a44214cdbf4577920861b1fdd369b9.u6QBMf35xMn76HKl
ES_NODE=http://elasticsearch:9200
QDRANT_URL=http://qdrant:6333
REDIS_HOST=redis
REDIS_PORT=6379
```

### 步骤2：启动所有服务

```bash
docker-compose up -d
```

这会启动：
- 主应用（端口3000）
- Elasticsearch（端口9200）
- Qdrant（端口6333）
- Redis（端口6379）

### 步骤3：初始化知识库

```bash
# 等待服务启动
sleep 30

# 初始化知识库到ES和Qdrant
docker-compose exec app node scripts/init_knowledge.js
```

### 步骤4：访问应用

```
http://localhost:3000
```

### 查看日志

```bash
# 应用日志
docker-compose logs -f app

# 所有服务日志
docker-compose logs -f
```

### 停止服务

```bash
docker-compose down
```

---

## ⚙️ 环境变量详细说明

### 必需配置

```env
# 智谱AI配置（必需）
ZHIPU_API_KEY=your_api_key_here
```

### 可选配置

```env
# 服务端口（默认3000）
PORT=3000

# Elasticsearch配置（可选，用于关键词搜索）
ES_NODE=http://localhost:9200

# Qdrant配置（可选，用于向量搜索）
QDRANT_URL=http://localhost:6333

# Redis配置（可选，用于缓存）
REDIS_HOST=localhost
REDIS_PORT=6379

# 运行环境
NODE_ENV=development

# 会话配置（可选）
SESSION_SECRET=your_session_secret
```

### 其他配置

```env
# AI模型配置
ZHIPU_VISION_MODEL=glm-4v-flash
ZHIPU_CHAT_MODEL=glm-4-flash

# 调试模式（可选）
AI_MOCK=1  # 启用模拟模式，不调用真实API
```

---

## 🔧 配置调整

### 会话管理配置

编辑 `session/manager.js`:

```javascript
const config = {
  maxMessages: 20,                    // 每个会话最多保存20条消息
  sessionTimeout: 30 * 60 * 1000,    // 30分钟无活动自动过期
  cleanupInterval: 5 * 60 * 1000     // 每5分钟清理一次过期会话
};
```

### RAG检索配置

编辑 `rag/retriever.js`:

```javascript
const config = {
  topK: 5,                // 返回前5个最相关结果
  vectorWeight: 0.6,      // 向量搜索权重
  keywordWeight: 0.4      // 关键词搜索权重
};
```

---

## 📱 前端开发模式

### 修改前端代码

前端代码在 `public/` 目录下，直接编辑即可：

```bash
# 修改主应用逻辑
code public/js/app.js

# 修改样式
code public/css/style.css

# 修改HTML
code public/index.html
```

### 刷新浏览器

修改后直接刷新浏览器即可看到效果（无需重启服务器）。

### PWA缓存更新

如果修改了静态资源，需要更新Service Worker版本：

编辑 `public/sw.js`:

```javascript
const CACHE_VERSION = 'v1.0.1';  // 修改版本号
```

---

## 🧪 测试功能

### 1. 测试前端界面

访问 `http://localhost:3000`，测试：
- [ ] 首页加载正常
- [ ] 饮食记录功能
- [ ] AI拍照识别
- [ ] 运动记录
- [ ] AI私教对话
- [ ] 个人中心

### 2. 测试Multi-Agent API

```bash
# 测试健康检查
curl http://localhost:3000/api/health

# 测试对话
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好"}'

# 测试工具调用
curl -X POST http://localhost:3000/api/tools/calculate \
  -H "Content-Type: application/json" \
  -d '{"calc_type":"bmr","gender":"male","age":25,"height":175,"weight":80}'
```

### 3. 运行测试套件

```bash
# 运行所有测试
npm test

# 或单独运行
node tests/classifier.test.js
node tests/nutrition-agent.test.js
node tests/retriever.test.js
```

---

## 🔥 生产环境部署

### 使用PM2（推荐）

```bash
# 安装PM2
npm install -g pm2

# 启动应用（集群模式）
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 查看日志
pm2 logs manmanshou-app

# 重启
pm2 restart manmanshou-app

# 停止
pm2 stop manmanshou-app

# 设置开机自启
pm2 startup
pm2 save
```

### 配置Nginx反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📊 监控和日志

### 应用日志位置

```
logs/
├── app-2026-09-03.log        # 应用日志
├── error-2026-09-03.log      # 错误日志
└── metrics-2026-09-03.json   # 性能指标
```

### 查看日志

```bash
# 查看应用日志
tail -f logs/app-*.log

# 查看错误日志
tail -f logs/error-*.log
```

### 监控指标

```bash
# 获取系统统计
curl http://localhost:3000/api/system/stats

# 获取Agent指标
curl http://localhost:3000/api/agent/metrics
```

---

## 🐛 常见问题

### 问题1: 端口3000被占用

```bash
# Windows查找占用进程
netstat -ano | findstr :3000

# 杀死进程
taskkill /PID <进程ID> /F

# 或修改端口
set PORT=3001
node server.js
```

### 问题2: 智谱API调用失败

检查：
1. ZHIPU_API_KEY是否正确
2. 网络连接是否正常
3. API余额是否充足

```bash
# 测试API密钥
node -e "console.log(process.env.ZHIPU_API_KEY)"
```

### 问题3: 前端页面空白

1. 检查浏览器控制台错误
2. 清除浏览器缓存
3. 检查Service Worker
4. 重启服务器

### 问题4: Agent不回复

查看日志：
```bash
tail -f logs/error-*.log
```

可能原因：
- 智谱API调用失败
- 网络超时
- 提示词问题

### 问题5: 数据库连接失败（Docker模式）

```bash
# 检查容器状态
docker-compose ps

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs elasticsearch
docker-compose logs qdrant
```

---

## 📚 相关文档

- [API完整文档](docs/API.md)
- [部署指南](docs/DEPLOYMENT.md)
- [项目总结](docs/PROJECT_SUMMARY.md)
- [Day 1-6开发记录](docs/)

---

## 🎯 快速命令汇总

```bash
# 基础启动
npm install
npm start

# Docker启动
docker-compose up -d

# 测试
npm test

# 生产部署
pm2 start ecosystem.config.js --env production

# 查看日志
tail -f logs/app-*.log

# 健康检查
curl http://localhost:3000/api/health
```

---

## ✨ 下一步

项目已完整启动，你可以：

1. **使用前端界面**: 访问 `http://localhost:3000`
2. **调用API**: 集成Multi-Agent API到你的应用
3. **开发新功能**: 添加新的Agent或工具
4. **部署上线**: 使用PM2或Docker部署到生产环境

---

**项目启动完成！祝使用愉快！** 🚀
