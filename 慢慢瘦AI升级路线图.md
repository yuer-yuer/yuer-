# 🚀 慢慢瘦 AI 升级路线图

> 从"记录工具"进化为"AI减脂伙伴"的完整规划

---

## 📊 现状盘点

### 已有能力
| 模块 | 状态 |
|------|------|
| 用户体系（注册/登录/Session） | ✅ 完成 |
| 个人资料（性别/年龄/身高/体重/BMR/TDEE） | ✅ 完成 |
| 饮食记录（内置食物库+自定义食物） | ✅ 完成 |
| 运动记录（MET值表） | ✅ 完成 |
| 体重记录 + 趋势图 | ✅ 完成 |
| 饮水记录 | ✅ 完成 |
| 历史查询 | ✅ 完成 |
| 热量环图 + 体重趋势图 | ✅ 完成 |

### 待实施（已有提示词）
- 📅 连续打卡日历 + 热力图
- 📊 周/月统计报告
- 🔔 定时提醒
- 🥗 常吃食物快捷入口

### 核心差距
**现在的慢慢瘦 = 手动记录器**，用户必须自己搜食物、自己算热量、自己判断吃得对不对。  
**竞品已经走到 = AI拍照识餐 + AI营养师 + AI陪伴教练**，差距在"智能化"。

---

## 🎯 AI功能规划：3大方向 × 3个阶段

### 总览

```
阶段0（基础）  →  阶段1（智能识别）  →  阶段2（AI教练）  →  阶段3（深度个性化）
   │                    │                     │                     │
 打卡/统计/提醒      拍照识别热量         AI陪伴教练           食谱推荐
 常吃食物快捷入口    食物适配度评分       对话式饮食分析        周期化减脂方案
 （已有提示词）      语音记录饮食         智能运动建议          社交挑战
```

---

## 🔥 阶段1：AI智能识别（最核心的差异化）

### 功能1.1：📸 拍照识别热量

**这是最重要的AI功能，也是最大卖点。** 目前小卡健康、恋上健康、Kaloria等竞品都在主打这个。

#### 技术方案

**方案A（推荐）：多模态大模型直接识别**
```
用户拍照 → 前端转Base64 → 后端调用多模态LLM → 返回食物名+热量+分量
```

| 项目 | 说明 |
|------|------|
| 模型选择 | **智谱GLM-4V**（视觉能力最强，免费100万Token）或 **通义千问VL** |
| 调用方式 | 后端 `POST /api/ai/recognize-food`，前端传图片Base64 |
| Prompt设计 | 精心构造系统提示词，要求模型返回结构化JSON |
| 兜底策略 | 模型返回结果后，与本地食物库做模糊匹配校正热量值 |
| 成本估算 | 每张图片约0.01-0.03元，免费额度可支持数千次 |

**方案B：专用食物识别API + 本地校正**
```
用户拍照 → LogMeal/SnapCalorie API识别 → 获取食物名 → 本地食物库查热量
```

| 项目 | 说明 |
|------|------|
| API选择 | LogMeal（30种食物免费/月）、Calorie Mama API |
| 优势 | 识别精度更高、响应更快 |
| 劣势 | 依赖第三方、免费额度少、中餐识别效果差 |

**👉 推荐方案A**，原因：
1. 多模态LLM对中餐识别更准（训练数据含中文菜谱）
2. 免费额度充足（智谱100万Token、阿里云百炼100万Token）
3. 可扩展性强（同一模型后续做AI教练）
4. 不依赖多个第三方服务

#### 前端交互设计

```
饮食Tab 新增 "📸 拍照记录" 按钮
    ↓
调用摄像头/相册（input type=file capture=camera）
    ↓
选择图片 → 显示loading动画 "AI正在分析你的餐食..."
    ↓
返回结果卡片：
  ┌─────────────────────────────────┐
  │ 📸 AI识别结果                    │
  │                                 │
  │ 🍚 米饭      约200g  232kcal    │
  │ 🥬 清炒时蔬   约150g   68kcal    │
  │ 🍗 红烧鸡块   约120g  198kcal    │
  │ ─────────────────────────       │
  │ 合计约 498kcal                  │
  │                                 │
  │ [✏️ 修改分量]  [✅ 确认添加]      │
  └─────────────────────────────────┘
```

关键：**必须允许用户修改AI的识别结果**，这是信任的基础。

#### 后端实现要点

```javascript
// server.js 新增
const axios = require('axios');

// AI配置（支持多模型切换）
const AI_CONFIG = {
  zhipu: {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4v-flash',  // 免费视觉模型
    apiKey: process.env.ZHIPU_API_KEY,
  },
  aliyun: {
    url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    model: 'qwen-vl-plus',
    apiKey: process.env.DASHSCOPE_API_KEY,
  }
};

app.post('/api/ai/recognize-food', requireAuth, async (req, res) => {
  const { image } = req.body; // Base64图片
  if (!image) return res.status(400).json(err(400, '请提供图片'));

  const config = AI_CONFIG.zhipu; // 默认用智谱
  
  const result = await axios.post(config.url, {
    model: config.model,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: RECOGNIZE_PROMPT },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } }
      ]
    }]
  }, {
    headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }
  });

  // 解析AI返回的结构化结果，与本地食物库校正
  // ...
});
```

**识别Prompt模板：**
```
你是一个专业的营养师AI。请分析这张食物照片，识别其中的所有食物。

要求：
1. 识别每种食物的中文名称
2. 估计每种食物的重量（克）
3. 计算每种食物的热量（千卡）
4. 判断餐次（早餐/午餐/晚餐/加餐）

请严格按以下JSON格式返回，不要返回其他内容：
{
  "meal_type": "lunch|dinner|breakfast|snack",
  "foods": [
    { "name": "食物名", "estimated_weight_g": 200, "calories": 232, "calories_per_100g": 116 }
  ],
  "total_calories": 498,
  "confidence": 0.85
}

注意：
- 如果无法识别某个食物，confidence设为0.3以下
- 中餐请用常见中文名（如"红烧肉"而非"braised pork"）
- 热量估算参考中国食物成分表
```

---

### 功能1.2：🥗 食物适配度评分

**原理：** 基于用户个人数据（BMI、TDEE、减脂目标、今日已摄入），对每种食物给出"适不适合你"的评分。

#### 评分维度

| 维度 | 权重 | 说明 |
|------|------|------|
| 热量密度 | 30% | 每100g热量 vs 用户剩余可用热量 |
| 营养价值 | 25% | 蛋白质含量高=加分，纯碳水=减分 |
| 时间适配 | 20% | 晚上吃高热量=减分，早餐吃碳水=加分 |
| 减脂友好 | 15% | 低GI、高纤维=加分 |
| 用户偏好 | 10% | 经常吃的食物=加分（习惯可持续性） |

#### 交互设计

在食物搜索结果和AI识别结果旁边，显示适配度标签：

```
🟢 85分 非常适合你    → 鸡胸肉（高蛋白、低脂、热量适中）
🟡 60分 还行         → 米饭（碳水偏高，但作为主食可接受）
🔴 35分 建议少吃     → 炸鸡排（高油高热，超出今日预算）
```

#### 后端实现

```javascript
app.post('/api/ai/food-score', requireAuth, (req, res) => {
  const { food_name, calories_per_100g, amount_g, meal_type } = req.body;
  const profile = AppState.profile; // 获取用户资料
  
  // 纯计算逻辑，不需要调LLM
  const score = calculateFoodScore({
    food_name,
    calories_per_100g,
    amount_g,
    meal_type,
    profile,
    todayIntake: AppState.todayFood, // 今日已摄入
  });
  
  res.json(ok(score));
});
```

**这个功能不需要LLM，纯规则引擎即可**，延迟低、零成本。

---

### 功能1.3：🎙️ 语音记录饮食

**原理：** 用户说"我今天中午吃了一份红烧肉和一碗米饭"，AI自动解析为食物记录。

```
用户语音输入 → 浏览器 Web Speech API 转文字 → LLM解析为食物列表 → 确认添加
```

#### 技术方案

- **语音转文字**：浏览器原生 `webkitSpeechRecognition`（免费、零依赖）
- **文字解析**：调用LLM（智谱GLM-4-flash，免费），将自然语言解析为结构化食物列表

```
Prompt: 
用户说："中午吃了半碗米饭，一份番茄炒蛋，还有一杯牛奶"
请解析为JSON：
{ "meal_type": "lunch", "foods": [
  { "name": "米饭", "amount_g": 100, "calories_per_100g": 116 },
  { "name": "番茄炒蛋", "amount_g": 200, "calories_per_100g": 80 },
  { "name": "牛奶", "amount_g": 250, "calories_per_100g": 54 }
]}
```

---

## 🤖 阶段2：AI陪伴教练（核心留存功能）

### 功能2.1：💬 AI减脂教练对话

**这是留存率的关键。** 比起冷冰冰的数字，用户更需要"有人陪"的感觉。

#### 角色设定

```
你是"小瘦"，慢慢瘦的AI减脂教练。

性格：
- 温暖但不溺爱，像专业的健身教练
- 会夸也会提醒，不搞PUA那套
- 偶尔幽默，经常鼓励

你能做：
- 根据用户数据给饮食建议
- 解释为什么某种食物适合/不适合
- 制定简单运动建议
- 回答减脂相关问题
- 在用户想放弃时鼓励

你不能做：
- 给出医疗诊断
- 推荐极端节食
- 保证具体减重数字
```

#### 交互设计

新增一个 **AI教练Tab**（第7个Tab），或做成悬浮按钮：

```
┌─────────────────────────────────────┐
│ 🤖 小瘦教练                          │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ 小瘦：                       │  │
│  │ 今天摄入了1,450kcal，离目标   │  │
│  │ 还差350kcal的空间。晚餐建议   │  │
│  │ 吃一份清蒸鱼+蔬菜沙拉，热量   │  │
│  │ 控制在400kcal以内~ 🐟        │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ 你：我特别想吃炸鸡怎么办      │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ 小瘦：                       │  │
│  │ 理解！馋炸鸡太正常了 😅       │  │
│  │ 但你今天热量空间只剩350了，    │  │
│  │ 一份炸鸡排≈500kcal会超标。    │  │
│  │ 妥协方案：空气炸锅做鸡胸肉，   │  │
│  │ 撒椒盐粉，口感接近但只有       │  │
│  │ 180kcal！要不要试试？💪       │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌─────────────────────────┐       │
│  │ 问问小瘦...              │ [发送] │
│  └─────────────────────────┘       │
└─────────────────────────────────────┘
```

#### 后端实现

```javascript
// AI教练对话API（流式响应）
app.post('/api/ai/coach-chat', requireAuth, async (req, res) => {
  const { message, conversation_id } = req.body;
  
  // 构建上下文：用户资料 + 今日数据 + 对话历史
  const context = buildCoachContext(req.session.userId);
  
  // 调用LLM（流式SSE）
  res.setHeader('Content-Type', 'text/event-stream');
  
  const stream = await callLLMStream({
    system: COACH_SYSTEM_PROMPT + '\n\n当前用户数据：\n' + JSON.stringify(context),
    messages: getConversationHistory(conversation_id),
    userMessage: message,
  });
  
  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
  }
  res.write('data: [DONE]\n\n');
  res.end();
});
```

**关键：AI教练必须"知道"用户数据**，否则就是通用ChatBot，没有价值。  
每次对话都要注入：用户BMI/TDEE/今日摄入/今日运动/目标体重/连续打卡天数等。

---

### 功能2.2：📋 智能饮食日报

**每天晚上8点，AI自动生成今日饮食分析：**

```
┌─────────────────────────────────────┐
│ 📋 今日饮食报告                      │
│                                     │
│ 总摄入：1,520 kcal（目标1,500）       │
│ 超出：+20 kcal（可接受范围）          │
│                                     │
│ ✅ 做得好的：                        │
│ · 蛋白质摄入充足（鸡胸肉+鸡蛋）       │
│ · 饮水量达标 2,100ml                 │
│ · 下午忍住了奶茶诱惑                  │
│                                     │
│ ⚠️ 可以改进的：                      │
│ · 晚餐碳水偏高（米饭200g）           │
│   → 建议：减到150g，加份蔬菜          │
│ · 膳食纤维不足                       │
│   → 建议：加个苹果或一把坚果          │
│                                     │
│ 💡 明日建议：                         │
│ 早餐试试全麦面包+牛油果，             │
│ 比油条热量低40%且更扛饿~             │
└─────────────────────────────────────┘
```

**实现**：定时任务（node-cron），每天20:00查所有活跃用户，调LLM生成报告，存数据库。

---

### 功能2.3：🏃 智能运动建议

基于用户数据推荐运动：

```
输入：用户BMI、今日摄入、天气、运动偏好、时间
输出：推荐运动方案

示例：
"你今天摄入了1,650kcal，超出目标150kcal。
 建议今晚做30分钟快走（消耗≈180kcal）就正好平衡了！
 如果想加速减脂，可以做20分钟HIIT（消耗≈250kcal）💪"
```

---

## 🧬 阶段3：深度个性化（长期方向）

### 功能3.1：🍽️ AI食谱推荐

```
基于：用户口味偏好 + 减脂目标 + 食材库存 + 今日营养缺口
生成：个性化食谱（含步骤、热量、营养素）
```

### 功能3.2：📊 周期化减脂方案

```
不是简单"每天少吃500kcal"，
而是根据体重趋势动态调整：
- 连续2周没掉秤 → 自动降低100kcal目标
- 掉秤太快（>1kg/周）→ 提醒加量防反弹
- 平台期 → 建议安排"欺骗餐"重启代谢
```

### 功能3.3：🏆 AI社交挑战

```
"本周挑战：连续5天热量不超标"
"7天减脂打卡赛"
AI记录每个参与者的进度，实时排名
```

---

## 🛠️ 技术架构升级

### 当前架构

```
浏览器 → Express → SQLite
         ↑ 纯手动
```

### 目标架构

```
浏览器 ──→ Express ──→ SQLite
  │           │
  │           ├──→ 多模态LLM API（智谱/阿里云）
  │           │     · 拍照识餐
  │           │     · 语音解析
  │           │     · AI教练对话
  │           │
  │           └──→ 本地规则引擎
  │                 · 食物适配度评分
  │                 · 营养缺口计算
  │                 · 运动推荐算法
  │
  └──→ 浏览器端
        · Web Speech API（语音输入）
        · Notification API（提醒）
        · Canvas（拍照预览）
```

### 需要新增的依赖

```json
{
  "axios": "^1.7",          // HTTP客户端（调LLM API）
  "node-cron": "^3.0",      // 定时任务（日报生成）
  "multer": "^1.4"          // 图片上传处理（可选，Base64方案不需要）
}
```

### 需要新增的文件

```
public/
├── js/
│   ├── ai-coach.js        // AI教练对话逻辑
│   ├── ai-camera.js       // 拍照识餐逻辑
│   └── ai-voice.js        // 语音输入逻辑
server.js                   // 新增AI相关API路由
.env                        // LLM API密钥（不入库）
```

### 数据库新增表

```sql
-- AI对话记录
CREATE TABLE IF NOT EXISTS ai_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,        -- 'user' | 'assistant'
  content TEXT NOT NULL,
  context JSON,              -- 对话时的用户数据快照
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI生成的日报
CREATE TABLE IF NOT EXISTS ai_daily_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  report_date TEXT NOT NULL,
  content TEXT NOT NULL,     -- 日报内容（Markdown）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, report_date)
);

-- 食物适配度缓存
CREATE TABLE IF NOT EXISTS food_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  food_name TEXT NOT NULL,
  score INTEGER,             -- 0-100
  reason TEXT,               -- 评分理由
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 💰 成本估算

### LLM API费用

| 平台 | 模型 | 免费额度 | 超出后价格 | 适合场景 |
|------|------|---------|-----------|---------|
| 智谱AI | GLM-4V-Flash | 100万Token/月 | ¥0.01/千Token | 拍照识餐 |
| 智谱AI | GLM-4-Flash | 100万Token/月 | ¥0.01/千Token | AI教练对话 |
| 阿里云 | Qwen-VL-Plus | 100万Token/3月 | ¥0.008/千Token | 拍照识餐（备选） |
| 阿里云 | Qwen-Plus | 100万Token/3月 | ¥0.004/千Token | 文本对话（备选） |

**结论：免费额度完全够用。** 假设每天10次拍照+20次对话，月消耗约50万Token，免费额度内搞定。

### 不需要LLM的功能（零成本）

- ✅ 食物适配度评分（纯规则引擎）
- ✅ 营养缺口计算（纯计算）
- ✅ 运动建议（规则+推荐算法）
- ✅ 日报模板生成（数据填充+简单逻辑）

---

## 📅 实施优先级

### P0 — 立刻做（1-2周）
1. **📸 拍照识别热量** — 最大的差异化卖点，技术门槛适中
2. **🥗 食物适配度评分** — 纯规则引擎，零成本，增强专业感

### P1 — 紧跟做（2-4周）
3. **💬 AI教练对话** — 留存核心，让用户"离不开"
4. **📋 智能饮食日报** — 自动化价值输出，让用户每天有理由回来

### P2 — 锦上添花（1-2月）
5. **🎙️ 语音记录饮食** — 降低记录门槛
6. **🏃 智能运动建议** — 完善运动维度

### P3 — 长期方向（2-3月）
7. **🍽️ 食谱推荐**
8. **📊 周期化减脂方案**
9. **🏆 社交挑战**

---

## ⚡ 快速启动指南：第一步做什么？

### 建议：先做拍照识别热量

**理由：**
1. 效果最直观 — 拍照→出结果，用户"哇"的瞬间
2. 技术路径最清晰 — 就是一个API调用
3. 能验证AI可行性 — 为后续AI功能铺路
4. 竞品都在做 — 不做就落后了

**启动步骤：**
1. 注册智谱AI开放平台 → open.bigmodel.cn → 获取API Key
2. 后端新增 `/api/ai/recognize-food` 接口
3. 前端饮食Tab新增拍照按钮
4. 联调测试 → 迭代Prompt → 优化识别准确率

---

*此文档为慢慢瘦AI升级的整体规划，每个功能的具体实施提示词可按优先级逐步编写。*
