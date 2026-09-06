# 阿里云 DashScope Embedding 方案

## 服务信息

**产品名称：** 阿里云百炼（DashScope）  
**Embedding模型：** text-embedding-v1 / text-embedding-v2

### 优势
- ✅ 国内服务，速度快
- ✅ 专门优化中文
- ✅ 稳定性好
- ✅ 价格便宜

---

## 定价

**text-embedding-v2（推荐）：**
- 价格：**0.0007元 / 1K tokens**
- 输入tokens计费

**预估成本（221个文档块）：**
- 总tokens：约50,000
- 成本：50 × 0.0007 = **0.035元**（约半毛钱）
- 远低于1元

**免费额度：**
- 新用户有免费试用额度
- 可能完全免费

---

## 模型对比

| 模型 | 维度 | 最大长度 | 价格(元/1K tokens) |
|------|------|---------|-------------------|
| text-embedding-v1 | 1536 | 2048 | 0.0007 |
| text-embedding-v2 | 1536 | 2048 | 0.0007 |

推荐使用 **v2**（效果更好）

---

## 接入步骤

### 1. 开通服务

访问：https://dashscope.aliyun.com/

1. 登录阿里云账号
2. 开通百炼服务
3. 创建API Key

### 2. 配置环境变量

添加到 `.env.agent`：

```env
# 阿里云 DashScope
DASHSCOPE_API_KEY=your_api_key_here
```

### 3. API调用

**Endpoint：** https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding

**请求示例：**
```bash
curl -X POST https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding \
  -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-v2",
    "input": {
      "texts": ["你的文本内容"]
    }
  }'
```

---

## 对比其他方案

| 方案 | 价格 | 中文优化 | 速度 | 稳定性 |
|------|------|---------|------|--------|
| **阿里云** | 0.035元 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Jina AI | 免费 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| OpenAI | $0.001 | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 智谱 | 已有 | ⭐⭐⭐ | ⭐ | ⭐ |

---

## 推荐使用阿里云 ⭐⭐⭐

**理由：**
1. ✅ 国内服务，无需翻墙，速度快
2. ✅ 中文优化最好
3. ✅ 价格极低（0.035元）
4. ✅ 稳定可靠
5. ✅ 可能有免费额度

**如果您同意，我立即切换到阿里云DashScope！**

请提供您的DashScope API Key，或者我先帮您修改代码，您获取到API Key后再运行初始化。
