# 慢慢瘦 - 部署指南

本文档提供详细的部署步骤，包括本地开发、Docker部署和生产环境部署。

---

## 目录

1. [环境要求](#环境要求)
2. [本地开发部署](#本地开发部署)
3. [Docker部署](#docker部署)
4. [生产环境部署](#生产环境部署)
5. [配置说明](#配置说明)
6. [健康检查](#健康检查)
7. [故障排查](#故障排查)

---

## 环境要求

### 基础环境
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **内存**: >= 2GB
- **磁盘**: >= 5GB

### 依赖服务
- **Elasticsearch**: 8.x (可选，用于关键词搜索)
- **Qdrant**: 1.7.x (可选，用于向量搜索)
- **Redis**: 7.x (可选，用于缓存)

> **注意**: Elasticsearch、Qdrant和Redis均为可选服务。系统在这些服务不可用时会自动降级到内存模式。

---

## 本地开发部署

### 1. 克隆项目

```bash
git clone <repository-url>
cd 慢慢瘦
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入智谱AI API密钥
# ZHIPU_API_KEY=your_api_key_here
```

### 4. 初始化数据

```bash
# 初始化知识库
node scripts/init-knowledge.js
```

### 5. 启动服务

```bash
# 开发模式（支持热重载）
npm run dev

# 或生产模式
npm start
```

服务将在 `http://localhost:3000` 启动。

### 6. 验证部署

```bash
# 健康检查
curl http://localhost:3000/api/health

# 测试对话
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好"}'
```

---

## Docker部署

### 方式1: 完整服务栈（推荐）

使用docker-compose一键部署所有服务（包括Elasticsearch、Qdrant、Redis）。

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 ZHIPU_API_KEY

# 2. 启动所有服务
docker-compose up -d

# 3. 查看日志
docker-compose logs -f app

# 4. 初始化知识库（首次部署）
docker-compose exec app node scripts/init-knowledge.js

# 5. 停止服务
docker-compose down

# 6. 停止并删除数据卷
docker-compose down -v
```

服务映射：
- **应用**: http://localhost:3000
- **Elasticsearch**: http://localhost:9200
- **Qdrant**: http://localhost:6333
- **Redis**: localhost:6379

### 方式2: 仅部署应用

如果您已有外部的Elasticsearch/Qdrant/Redis服务，可以只部署应用容器。

```bash
# 1. 构建镜像
docker build -t manmanshou-app .

# 2. 运行容器
docker run -d \
  --name manmanshou-app \
  -p 3000:3000 \
  -e ZHIPU_API_KEY=your_api_key \
  -e ES_NODE=http://your-es-host:9200 \
  -e QDRANT_URL=http://your-qdrant-host:6333 \
  -e REDIS_HOST=your-redis-host \
  -v $(pwd)/data:/app/data \
  manmanshou-app

# 3. 查看日志
docker logs -f manmanshou-app

# 4. 停止容器
docker stop manmanshou-app
docker rm manmanshou-app
```

---

## 生产环境部署

### 1. 系统优化

#### Node.js进程管理（推荐使用PM2）

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name manmanshou-app -i max

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

#### PM2配置文件 (ecosystem.config.js)

```javascript
module.exports = {
  apps: [{
    name: 'manmanshou-app',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
```

使用配置文件启动：
```bash
pm2 start ecosystem.config.js
```

### 2. Nginx反向代理

```nginx
upstream manmanshou_backend {
    least_conn;
    server 127.0.0.1:3000 weight=10 max_fails=3 fail_timeout=30s;
    # 如果有多个实例
    # server 127.0.0.1:3001 weight=10 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name your-domain.com;

    # 日志
    access_log /var/log/nginx/manmanshou-access.log;
    error_log /var/log/nginx/manmanshou-error.log;

    # 限流
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    location / {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://manmanshou_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 健康检查
    location /api/health {
        proxy_pass http://manmanshou_backend;
        access_log off;
    }
}

# HTTPS配置（推荐生产环境使用）
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 其他配置同上...
}
```

### 3. 性能优化建议

#### 应用层优化
- 启用Node.js集群模式（使用PM2的cluster模式）
- 配置适当的内存限制（建议1-2GB每实例）
- 使用Redis缓存频繁查询的结果
- 配置会话超时时间（默认30分钟）

#### 数据库优化
- Elasticsearch: 增加堆内存大小（生产环境建议2-4GB）
- Qdrant: 使用持久化存储，定期备份
- Redis: 配置持久化策略（AOF + RDB）

#### 监控和日志
- 配置日志轮转（使用PM2或logrotate）
- 设置应用监控（PM2 Plus、New Relic等）
- 配置告警规则（内存、CPU、错误率）

### 4. 数据备份

```bash
# 备份用户数据
tar -czf backup-users-$(date +%Y%m%d).tar.gz data/users/

# 备份Qdrant向量数据
docker exec manmanshou-qdrant tar -czf /tmp/qdrant-backup.tar.gz /qdrant/storage
docker cp manmanshou-qdrant:/tmp/qdrant-backup.tar.gz ./backup-qdrant-$(date +%Y%m%d).tar.gz

# 定期备份脚本（添加到crontab）
0 2 * * * /path/to/backup-script.sh
```

---

## 配置说明

### 环境变量

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `ZHIPU_API_KEY` | ✅ | - | 智谱AI API密钥 |
| `PORT` | ❌ | 3000 | 服务端口 |
| `NODE_ENV` | ❌ | development | 运行环境 |
| `ES_NODE` | ❌ | http://localhost:9200 | Elasticsearch地址 |
| `QDRANT_URL` | ❌ | http://localhost:6333 | Qdrant地址 |
| `REDIS_HOST` | ❌ | localhost | Redis主机 |
| `REDIS_PORT` | ❌ | 6379 | Redis端口 |
| `LOG_LEVEL` | ❌ | info | 日志级别 |

### 会话管理配置

编辑 `session/manager.js`:

```javascript
const config = {
  maxMessages: 20,           // 每个会话最多保存20条消息
  sessionTimeout: 30 * 60 * 1000,  // 30分钟无活动自动过期
  cleanupInterval: 5 * 60 * 1000   // 每5分钟清理一次过期会话
};
```

### 用户数据配置

编辑 `session/userProfile.js`:

```javascript
const MAX_WEIGHT_HISTORY = 100;   // 最多保存100条体重记录
const MAX_EXERCISE_HISTORY = 100; // 最多保存100条运动记录
```

---

## 健康检查

### API健康检查

```bash
curl http://localhost:3000/api/health
```

正常响应：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "memory": { ... },
    "timestamp": "2026-09-03T08:00:00.000Z"
  }
}
```

### Docker健康检查

```bash
# 查看容器健康状态
docker ps

# 查看详细健康检查日志
docker inspect --format='{{json .State.Health}}' manmanshou-app | jq
```

### 系统监控指标

```bash
# 获取系统统计
curl http://localhost:3000/api/system/stats

# 获取Agent指标
curl http://localhost:3000/api/agent/metrics
```

---

## 故障排查

### 常见问题

#### 1. 服务无法启动

**症状**: 运行 `npm start` 后服务立即退出

**排查步骤**:
```bash
# 检查端口占用
netstat -ano | findstr :3000

# 检查环境变量
node -e "console.log(process.env.ZHIPU_API_KEY)"

# 查看详细错误
node server.js
```

**解决方案**:
- 确保 `ZHIPU_API_KEY` 已正确配置
- 更换未被占用的端口
- 检查Node.js版本 >= 18

#### 2. Elasticsearch连接失败

**症状**: 日志显示 "Elasticsearch connection failed"

**排查步骤**:
```bash
# 测试Elasticsearch连接
curl http://localhost:9200

# 查看Elasticsearch日志
docker logs manmanshou-es
```

**解决方案**:
- 系统会自动降级到内存模式，功能不受影响
- 如需使用ES，确保服务正常运行
- 检查网络和防火墙配置

#### 3. Qdrant向量搜索失败

**症状**: 知识检索返回空结果

**排查步骤**:
```bash
# 测试Qdrant连接
curl http://localhost:6333/collections

# 检查collection是否存在
curl http://localhost:6333/collections/knowledge_base
```

**解决方案**:
- 运行 `node scripts/init-knowledge.js` 初始化
- 系统会自动降级到纯关键词搜索
- 检查Qdrant数据持久化配置

#### 4. 内存占用过高

**症状**: 服务运行一段时间后内存持续增长

**排查步骤**:
```bash
# 查看内存使用
curl http://localhost:3000/api/health | jq .data.memory

# PM2内存监控
pm2 monit
```

**解决方案**:
- 配置PM2最大内存限制: `max_memory_restart: '1G'`
- 减少会话保存的消息数量
- 定期清理过期会话
- 启用Redis缓存减轻内存压力

#### 5. API响应缓慢

**症状**: 对话接口响应时间超过5秒

**排查步骤**:
```bash
# 查看响应时间指标
curl http://localhost:3000/api/agent/metrics

# 检查LLM调用耗时
# 查看应用日志
```

**解决方案**:
- 智谱API网络问题，检查网络连接
- 优化RAG检索参数（减少topK数量）
- 使用Redis缓存常见问题答案
- 启用Nginx代理和负载均衡

#### 6. Docker容器无法启动

**症状**: `docker-compose up` 失败

**排查步骤**:
```bash
# 查看容器状态
docker-compose ps

# 查看容器日志
docker-compose logs app

# 查看Elasticsearch日志
docker-compose logs elasticsearch
```

**解决方案**:
- Elasticsearch需要较大内存，确保 `vm.max_map_count` 配置正确:
  ```bash
  # Linux
  sudo sysctl -w vm.max_map_count=262144
  
  # Windows WSL2
  wsl -d docker-desktop sysctl -w vm.max_map_count=262144
  ```
- 检查端口冲突
- 确保磁盘空间充足

---

## 安全建议

1. **API密钥管理**
   - 不要将 `.env` 文件提交到版本控制
   - 生产环境使用密钥管理服务
   - 定期轮换API密钥

2. **网络安全**
   - 使用HTTPS（配置SSL证书）
   - 配置CORS白名单
   - 启用请求速率限制
   - 使用防火墙限制服务访问

3. **数据安全**
   - 定期备份用户数据
   - 敏感数据加密存储
   - 实施数据保留策略
   - 遵守隐私法规（GDPR、个人信息保护法）

4. **访问控制**
   - 实施用户认证（JWT、OAuth）
   - API访问令牌验证
   - 日志审计
   - 异常访问检测

---

## 扩展阅读

- [API文档](./API.md)
- [项目README](../README.md)
- [智谱AI文档](https://open.bigmodel.cn/dev/api)
- [Elasticsearch文档](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Qdrant文档](https://qdrant.tech/documentation/)
- [PM2文档](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

## 技术支持

如遇到问题或需要帮助，请：

1. 查看日志文件: `logs/`
2. 检查健康状态: `GET /api/health`
3. 查看系统统计: `GET /api/system/stats`
4. 提交Issue到项目仓库

---

**版本**: 1.0.0  
**更新日期**: 2026-09-03
