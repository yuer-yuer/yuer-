# Embedding服务方案对比

## 方案1：OpenAI Embeddings（推荐）⭐

**API：** text-embedding-3-small / text-embedding-3-large

**优势：**
- 质量高，稳定性好
- 速率限制宽松（3000 RPM）
- 支持中文
- 维度可调（512-3072）

**价格：**
- text-embedding-3-small: $0.02 / 1M tokens
- text-embedding-3-large: $0.13 / 1M tokens
- **估算：** 221个文档块约5万tokens ≈ $0.001（几乎免费）

**接入方式：**
```javascript
// 替换embeddings.js中的API
baseURL: 'https://api.openai.com/v1/embeddings'
model: 'text-embedding-3-small'
```

---

## 方案2：Cohere Embeddings

**API：** embed-multilingual-v3.0

**优势：**
- 支持100+语言
- 专门优化多语言
- 免费额度：100次调用/月

**价格：**
- $0.10 / 1M tokens
- 有免费试用

**缺点：**
- 免费额度较少
- 需要注册Cohere账号

---

## 方案3：Jina AI Embeddings（免费）⭐⭐

**API：** jina-embeddings-v2-base-zh

**优势：**
- **完全免费**（有限额）
- 专门优化中文
- 8192 token context
- 速率：60 RPM（够用）

**价格：**
- 免费版：1M tokens/月
- **完全够用！**

**接入方式：**
```javascript
baseURL: 'https://api.jina.ai/v1/embeddings'
model: 'jina-embeddings-v2-base-zh'
```

---

## 方案4：继续使用智谱（优化调用）

**优化策略：**
- 增加请求间隔（每个请求间隔5秒）
- 分批处理（每次10个）
- 添加更长的重试等待时间

**优势：**
- 已经配置好
- 支持中文
- 不需要换API

**缺点：**
- 限流较严格
- 需要更长时间完成

---

## 💡 推荐方案

### 最优选择：Jina AI（免费）⭐⭐⭐

**理由：**
1. ✅ 完全免费，1M tokens/月够用
2. ✅ 专门优化中文
3. ✅ 接入简单
4. ✅ 60 RPM速率限制合理

**预估成本：** $0

### 次优选择：OpenAI（付费但便宜）⭐⭐

**理由：**
1. ✅ 质量最高
2. ✅ 速率限制宽松
3. ✅ 成本极低（约$0.001）

**预估成本：** < $0.01

---

## 立即实施建议

我建议使用 **Jina AI**（免费且专门优化中文），如果您同意，我立即：

1. 注册Jina AI账号（或您提供API Key）
2. 修改 `rag/embeddings.js` 切换到Jina API
3. 重新运行知识库初始化
4. 完成向量化

**您想用哪个方案？**
- Jina AI（免费）
- OpenAI（付费但很便宜）
- 继续优化智谱API
