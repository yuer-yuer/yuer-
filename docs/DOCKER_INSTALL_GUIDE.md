# Docker安装指南（Windows）

本指南帮助你在Windows系统上安装Docker，以启动慢慢瘦项目所需的Qdrant、Elasticsearch和Redis服务。

---

## 方案一：安装Docker Desktop（推荐）

### 1. 系统要求

- Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041或更高版本)
- 或 Windows 11 64-bit: Home or Pro version 21H2或更高版本
- 启用WSL 2功能
- 硬件支持虚拟化

### 2. 安装步骤

#### 步骤1：启用WSL 2

打开PowerShell（管理员权限）：

```powershell
# 启用WSL
wsl --install

# 设置WSL 2为默认版本
wsl --set-default-version 2

# 重启电脑
```

#### 步骤2：下载Docker Desktop

1. 访问官方下载页面：https://www.docker.com/products/docker-desktop
2. 点击"Download for Windows"
3. 下载完成后双击 `Docker Desktop Installer.exe`

#### 步骤3：安装Docker Desktop

1. 按照安装向导提示操作
2. 选择"Use WSL 2 instead of Hyper-V"（推荐）
3. 等待安装完成
4. 重启电脑

#### 步骤4：启动Docker Desktop

1. 双击桌面图标启动Docker Desktop
2. 等待Docker引擎启动（右下角Docker图标变为绿色）
3. 首次启动可能需要1-2分钟

#### 步骤5：验证安装

打开Git Bash或PowerShell：

```bash
# 验证Docker版本
docker --version
# 应输出：Docker version 24.x.x, build xxxxx

# 验证Docker Compose版本
docker compose version
# 应输出：Docker Compose version v2.x.x

# 运行测试容器
docker run hello-world
# 应输出："Hello from Docker!"
```

### 3. 启动项目服务

```bash
# 进入项目目录
cd d:\科林冲刺\项目班\AI\AIcode\慢慢瘦

# 启动所有服务
docker compose up -d

# 查看运行中的容器
docker ps

# 应看到3个容器：
# - manmanshou-qdrant
# - manmanshou-es
# - manmanshou-redis
```

### 4. 验证服务

```bash
# 验证Qdrant（向量数据库）
curl http://localhost:6333/collections
# 应返回JSON响应

# 验证Elasticsearch（搜索引擎）
curl http://localhost:9200
# 应返回ES版本信息JSON

# 验证Redis（缓存）
redis-cli ping
# 应返回：PONG
```

---

## 方案二：不安装Docker的替代方案

如果无法安装Docker（权限限制、系统不兼容等），可以使用以下替代方案：

### 替代方案A：使用云服务

**Qdrant Cloud（免费1GB）：**
1. 注册：https://cloud.qdrant.io
2. 创建集群，获取URL和API Key
3. 更新 `.env.agent`：
   ```
   QDRANT_URL=https://xxxxx.qdrant.cloud
   QDRANT_API_KEY=your_api_key
   ```

**Elasticsearch Cloud（14天免费试用）：**
1. 注册：https://cloud.elastic.co
2. 创建部署，获取Cloud ID和密码
3. 更新配置使用云端ES

**Redis Cloud（免费30MB）：**
1. 注册：https://redis.com/try-free
2. 创建数据库，获取连接信息
3. 更新 `.env.agent` 中的Redis配置

### 替代方案B：本地简化方案

修改代码使用本地存储（仅用于开发测试）：

**Qdrant替代：** 使用内存向量存储
```javascript
// rag/qdrant.js
// 使用数组存储向量，用于临时开发
```

**Elasticsearch替代：** 跳过关键词检索
```javascript
// rag/retriever.js
// 只使用Qdrant向量检索，不使用ES
```

**Redis替代：** 使用内存缓存
```javascript
// monitoring/cache.js
// 使用Map对象替代Redis
```

**注意：** 这些替代方案仅用于开发测试，生产环境仍建议使用Docker或云服务。

---

## 常见问题

### Q1: Docker Desktop启动失败

**解决方案：**
1. 检查是否启用了虚拟化（BIOS设置）
2. 确保WSL 2已正确安装
3. 以管理员身份运行Docker Desktop
4. 查看Docker Desktop日志（Settings → Troubleshoot）

### Q2: WSL 2安装失败

**解决方案：**
```powershell
# 手动启用Windows功能
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 重启电脑后，下载WSL 2内核更新包：
# https://aka.ms/wsl2kernel
```

### Q3: Docker容器启动失败

**解决方案：**
```bash
# 查看容器日志
docker logs manmanshou-qdrant
docker logs manmanshou-es
docker logs manmanshou-redis

# 重新启动服务
docker compose down
docker compose up -d
```

### Q4: Elasticsearch内存不足

**解决方案：**
- 修改 `docker-compose.yml`，减少ES内存：
  ```yaml
  environment:
    - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
  ```

### Q5: 端口被占用

**解决方案：**
```bash
# 检查端口占用
netstat -ano | findstr "6333"  # Qdrant
netstat -ano | findstr "9200"  # ES
netstat -ano | findstr "6379"  # Redis

# 修改docker-compose.yml中的端口映射
```

---

## 资源和文档

- **Docker官方文档：** https://docs.docker.com
- **Docker Desktop下载：** https://www.docker.com/products/docker-desktop
- **WSL 2安装指南：** https://docs.microsoft.com/zh-cn/windows/wsl/install
- **Qdrant文档：** https://qdrant.tech/documentation
- **Elasticsearch文档：** https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html
- **Redis文档：** https://redis.io/documentation

---

## 下一步

Docker安装并启动服务后，回到Day 1任务：

1. 验证所有服务运行正常
2. 运行知识库初始化脚本：
   ```bash
   node scripts/init_knowledge.js
   ```
3. 进入Day 2：Multi-Agent架构实施

---

**需要帮助？** 请参考项目README.md或查看docs/目录中的其他文档。
