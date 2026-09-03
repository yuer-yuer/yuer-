# Jina AI Embedding 接入指南

## 快速开始

### 1. 获取API Key

访问：https://jina.ai/embeddings/

1. 点击 "Get API Key" 或 "Sign Up"
2. 使用GitHub/Google账号登录
3. 在Dashboard复制API Key

### 2. 配置环境变量

将API Key添加到 `.env.agent`：

```env
# Jina AI Embedding
JINA_API_KEY=your_jina_api_key_here
```

### 3. 运行初始化

```bash
node scripts/init_knowledge.js
```

---

## API详情

**Endpoint：** https://api.jina.ai/v1/embeddings  
**Model：** jina-embeddings-v2-base-zh  
**维度：** 768  
**Context长度：** 8192 tokens  
**速率限制：** 60 RPM（免费版）  
**月度限额：** 1M tokens

---

## 预估使用量

- 文档块数：221个
- 平均长度：约200 tokens/块
- **总计：** ~44,000 tokens
- **占用配额：** 4.4%
- **剩余配额：** 足够再向量化20次

---

**等待您的Jina API Key...**
