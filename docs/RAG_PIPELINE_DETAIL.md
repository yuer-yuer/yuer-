# RAG完整Pipeline详解

## 📋 概述

本项目实现了一个**混合检索（Hybrid Retrieval）**的RAG系统，结合了向量检索和关键词检索的优势。

---

## 🔄 完整Pipeline流程图

```
用户查询 "减肥可以吃鸡蛋吗？"
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 1: Query Embedding                                  │
│ 将查询文本转换为向量                                      │
│ Input: "减肥可以吃鸡蛋吗？"                               │
│ Output: [0.123, -0.456, ..., 0.789] (1536维向量)        │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: Parallel Retrieval (并行检索)                    │
│                                                          │
│  ┌─────────────────────┐    ┌──────────────────────┐   │
│  │ Vector Search       │    │ Keyword Search       │   │
│  │ (Qdrant)            │    │ (Elasticsearch)      │   │
│  │                     │    │                      │   │
│  │ 语义相似度检索       │    │ BM25关键词匹配        │   │
│  │ Top 20 结果         │    │ Top 20 结果          │   │
│  └─────────────────────┘    └──────────────────────┘   │
│           ↓                           ↓                 │
│      [Doc1, Doc3,              [Doc2, Doc1,            │
│       Doc5, ...]               Doc4, ...]              │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: Result Fusion (结果融合)                         │
│ 使用加权融合策略                                          │
│                                                          │
│ fusedScore = vectorScore × 0.6 + keywordScore × 0.4     │
│                                                          │
│ Doc1: 向量0.9 + 关键词0.8 = 0.86                         │
│ Doc2: 向量0.7 + 关键词0.9 = 0.78                         │
│ Doc3: 向量0.85 + 关键词0.0 = 0.51                        │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 4: Reranking (重排序)                               │
│ 基于余弦相似度重新计算相关性                               │
│                                                          │
│ 1. 对每个候选文档的content重新生成Embedding               │
│ 2. 计算与查询向量的余弦相似度                             │
│ 3. 作为新的score排序                                     │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 5: Filtering & Top-K (过滤和截断)                   │
│ 1. 过滤低于阈值的结果 (score < 0.5)                      │
│ 2. 取Top-5结果                                           │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 6: Context Generation (上下文生成)                  │
│ 将检索结果格式化为Prompt上下文                            │
│                                                          │
│ "以下是相关知识：                                         │
│  [1] 鸡蛋是优质蛋白来源...                                │
│  [2] 减肥期间适量食用鸡蛋..."                             │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 7: LLM Generation (大模型生成)                      │
│ System Prompt + Context + User Query → LLM              │
│                                                          │
│ Output: "鸡蛋是减肥期间的好选择，因为..."                 │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 详细步骤说明

### Step 1: Query Embedding（查询向量化）

**代码位置**: `retriever.js:24`

```javascript
const queryVector = await embeddingService.embed(query);
```

**技术栈**:
- 模型: DashScope text-embedding-v3
- 维度: 1536维

**作用**:
将用户的文本查询转换为高维向量表示，用于语义相似度计算。

**示例**:
```
输入: "减肥可以吃鸡蛋吗？"
输出: [0.123, -0.456, 0.789, ..., 0.234]  // 1536维向量
```

---

### Step 2: Parallel Retrieval（并行检索）

这是混合检索的核心，同时进行向量检索和关键词检索。

#### 2.1 Vector Search（向量检索）

**代码位置**: `retriever.js:29-37`

```javascript
vectorResults = await qdrantService.search(
  queryVector,
  this.topK * 2,  // 取Top 20
  category ? { must: [{ key: 'category', match: { value: category } }] } : null
);
```

**技术栈**: Qdrant向量数据库

**检索原理**:
1. 计算查询向量与知识库中所有向量的余弦相似度
2. 返回相似度最高的Top 20个文档
3. 支持category过滤（nutrition/fitness）

**优势**:
- ✅ 语义相似：理解"鸡蛋"和"蛋白质食物"的相似性
- ✅ 同义词：理解"减脂"="减肥"

**劣势**:
- ❌ 精确匹配弱：可能漏掉关键词精确匹配

**数据结构**:
```javascript
[
  {
    id: "doc_123",
    content: "鸡蛋是优质蛋白来源...",
    score: 0.89,  // 余弦相似度
    category: "nutrition"
  },
  ...
]
```

#### 2.2 Keyword Search（关键词检索）

**代码位置**: `retriever.js:40-44`

```javascript
const keywordResults = await elasticsearchService.search(
  query,
  this.topK * 2,  // 取Top 20
  category
);
```

**技术栈**: Elasticsearch（BM25算法）

**检索原理**:
1. 分词："减肥可以吃鸡蛋吗" → ["减肥", "吃", "鸡蛋"]
2. BM25算分：基于词频(TF)、逆文档频率(IDF)
3. 返回分数最高的Top 20

**BM25公式**:
```
score(D, Q) = Σ IDF(qi) × f(qi, D) × (k1 + 1)
              ─────────────────────────────────
              f(qi, D) + k1 × (1 - b + b × |D|/avgdl)

其中:
- qi: 查询词
- f(qi, D): 词qi在文档D中的频率
- |D|: 文档长度
- avgdl: 平均文档长度
- k1, b: 调节参数
```

**优势**:
- ✅ 精确匹配：准确找到包含"鸡蛋"的文档
- ✅ 速度快：倒排索引O(1)查询

**劣势**:
- ❌ 语义理解弱：不理解"蛋类"和"鸡蛋"的关系

---

### Step 3: Result Fusion（结果融合）

**代码位置**: `retriever.js:92-136`

```javascript
_fuseResults(vectorResults, keywordResults) {
  const resultsMap = new Map();
  
  // 1. 归一化向量分数
  const maxVectorScore = Math.max(...vectorResults.map(r => r.score));
  vectorResults.forEach(result => {
    const normalizedScore = result.score / maxVectorScore;
    resultsMap.set(result.id, {
      ...result,
      vectorScore: normalizedScore,
      fusedScore: normalizedScore * 0.6  // 向量权重60%
    });
  });
  
  // 2. 归一化关键词分数并合并
  const maxKeywordScore = Math.max(...keywordResults.map(r => r.score));
  keywordResults.forEach(result => {
    const normalizedScore = result.score / maxKeywordScore;
    
    if (resultsMap.has(result.id)) {
      // 文档同时出现在两个检索结果中
      const existing = resultsMap.get(result.id);
      existing.keywordScore = normalizedScore;
      existing.fusedScore = 
        existing.vectorScore * 0.6 + normalizedScore * 0.4;
    } else {
      // 只在关键词检索中出现
      resultsMap.set(result.id, {
        ...result,
        keywordScore: normalizedScore,
        fusedScore: normalizedScore * 0.4  // 关键词权重40%
      });
    }
  });
  
  // 3. 排序
  return Array.from(resultsMap.values())
    .sort((a, b) => b.fusedScore - a.fusedScore);
}
```

**融合策略**（配置在`rag.config.js`）:
```javascript
hybridWeights: {
  vector: 0.6,    // 向量权重60%
  keyword: 0.4    // 关键词权重40%
}
```

**融合示例**:
```
文档A:
- 向量检索: 0.9 → 归一化: 0.9
- 关键词检索: 0.8 → 归一化: 0.8
- 融合分数: 0.9 × 0.6 + 0.8 × 0.4 = 0.86

文档B:
- 向量检索: 0.7 → 归一化: 0.7
- 关键词检索: 0 (没找到) → 归一化: 0
- 融合分数: 0.7 × 0.6 + 0 × 0.4 = 0.42

文档C:
- 向量检索: 0 (没找到) → 归一化: 0
- 关键词检索: 0.9 → 归一化: 0.9
- 融合分数: 0 × 0.6 + 0.9 × 0.4 = 0.36
```

**为什么融合？**
- 向量检索：善于语义理解，但可能漏掉精确关键词
- 关键词检索：善于精确匹配，但不理解语义
- 融合：取长补短，提高召回率和准确率

---

### Step 4: Reranking（重排序）

**代码位置**: `retriever.js:141-159`

```javascript
async _rerank(query, queryVector, results) {
  const rerankedResults = [];
  
  for (const result of results) {
    // 1. 重新生成文档内容的Embedding（取前500字）
    const contentVector = await embeddingService.embed(
      result.content.substring(0, 500)
    );
    
    // 2. 计算查询向量与文档向量的余弦相似度
    const similarity = embeddingService.cosineSimilarity(
      queryVector, 
      contentVector
    );
    
    // 3. 用真实相似度替换融合分数
    rerankedResults.push({
      ...result,
      score: similarity,           // 新分数
      originalScore: result.fusedScore  // 保留原分数
    });
  }
  
  // 4. 按新分数重新排序
  return rerankedResults.sort((a, b) => b.score - a.score);
}
```

**余弦相似度计算**:
```javascript
cosineSimilarity(vecA, vecB) {
  // 点积
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  
  // 向量模长
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  // 余弦相似度
  return dotProduct / (normA * normB);
}
```

**输出范围**: [-1, 1]
- 1: 完全相同
- 0: 正交（无关）
- -1: 完全相反

**为什么Rerank？**
1. **融合分数不精确**：简单的加权组合，没有真正衡量语义相关性
2. **Rerank更准确**：基于查询和文档的真实语义相似度
3. **提高Top-K质量**：最终返回的5个结果更相关

**性能考虑**:
- Rerank需要重新生成Embedding（耗时）
- 只对融合后的候选结果Rerank（不是全量）
- 取前500字减少计算量

---

### Step 5: Filtering & Top-K（过滤和截断）

**代码位置**: `retriever.js:67-69`

```javascript
const filteredResults = rerankedResults
  .filter(r => r.score >= this.scoreThreshold)  // 过滤低于0.5的
  .slice(0, ragConfig.retrieval.rerankerTopK);  // 取Top 5
```

**配置**（在`rag.config.js`）:
```javascript
retrieval: {
  scoreThreshold: 0.5,    // 分数阈值
  rerankerTopK: 5,        // 最终返回5个结果
  topK: 10                // 初始检索数量
}
```

**过滤规则**:
- score < 0.5：低相关性，丢弃
- score >= 0.5：保留

**为什么Top-5？**
- ✅ 控制上下文长度：避免Token浪费
- ✅ 保证质量：5个高质量结果优于10个混杂结果
- ✅ 成本考虑：减少LLM输入Token

---

### Step 6: Context Generation（上下文生成）

**代码位置**: `retriever.js:164-176`

```javascript
formatContext(results) {
  if (results.length === 0) {
    return '没有找到相关知识。';
  }
  
  let context = '以下是相关知识：\n\n';
  
  results.forEach((result, idx) => {
    context += `【知识片段${idx + 1}】\n${result.content}\n\n`;
  });
  
  return context;
}
```

**输出示例**:
```
以下是相关知识：

【知识片段1】
鸡蛋是优质蛋白来源，每100克含13克蛋白质，且含有人体必需的8种氨基酸。
减肥期间适量食用鸡蛋可以增加饱腹感，减少热量摄入。

【知识片段2】
鸡蛋的热量为每100克156千卡，一个中等大小的鸡蛋约60克，含94千卡。
建议减肥期间每天食用1-2个鸡蛋，最好水煮或蒸煮。

【知识片段3】
鸡蛋虽然胆固醇含量较高，但对健康人群的血脂影响较小。
研究表明，每天1-2个鸡蛋不会增加心血管疾病风险。
```

---

### Step 7: LLM Generation（大模型生成）

**代码位置**: `nutrition-subgraph.js:45-65`

```javascript
// 1. 将RAG检索结果注入System Prompt
const knowledge = ragResults.map((r, i) => 
  `[${i + 1}] ${r.content}`
).join('\n\n');

const systemPrompt = nutritionPrompt.replace('{knowledge}', knowledge);

// 2. 构建消息
const messages = [
  new SystemMessage(systemPrompt),
  new HumanMessage(userQuery)
];

// 3. 调用LLM
const response = await nutritionLLM.invoke(messages);
```

**完整Prompt结构**:
```
System: 你是营养师小营，基于以下知识回答用户问题：

【知识片段1】
鸡蛋是优质蛋白来源...

【知识片段2】
减肥期间适量食用鸡蛋...

回答原则：
1. 基于知识库内容回答
2. 如果知识库没有相关信息，明确告知
3. 给出具体可行的建议

User: 减肥可以吃鸡蛋吗？