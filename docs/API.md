# 慢慢瘦 API 文档

**版本：** 1.0.0  
**基础URL：** `http://localhost:3000/api`

---

## 目录

1. [会话管理](#会话管理)
2. [用户配置](#用户配置)
3. [对话接口](#对话接口)
4. [工具接口](#工具接口)
5. [系统接口](#系统接口)

---

## 响应格式

### 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2026-09-03T16:00:00.000Z"
}
```

### 错误响应
```json
{
  "success": false,
  "data": null,
  "message": "错误描述",
  "error": "详细错误信息",
  "timestamp": "2026-09-03T16:00:00.000Z"
}
```

---

## 会话管理

### 创建会话

**POST** `/session/create`

创建一个新的对话会话。

**请求体：**
```json
{
  "userId": "user123"  // 可选，默认为 "anonymous"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "sessionId": "ef6c3b5a-6ab6-4155-9521-4b1d57eded1a",
    "userId": "user123",
    "createdAt": "2026-09-03T08:00:00.000Z"
  },
  "message": "会话创建成功"
}
```

---

### 获取会话信息

**GET** `/session/:sessionId`

获取指定会话的详细信息和统计。

**响应：**
```json
{
  "success": true,
  "data": {
    "sessionId": "ef6c3b5a-6ab6-4155-9521-4b1d57eded1a",
    "userId": "user123",
    "messageCount": 10,
    "intents": ["nutrition", "fitness"],
    "duration": 120,
    "idleTime": 30,
    "createdAt": "2026-09-03T08:00:00.000Z",
    "lastActiveAt": "2026-09-03T08:02:00.000Z"
  }
}
```

---

### 清除会话

**DELETE** `/session/:sessionId`

删除指定会话及其历史消息。

**响应：**
```json
{
  "success": true,
  "message": "会话已清除"
}
```

---

### 获取活跃会话列表

**GET** `/session/list`

获取所有活跃会话的列表。

**响应：**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "ef6c3b5a...",
        "userId": "user123",
        "messageCount": 10,
        "lastActiveAt": "2026-09-03T08:02:00.000Z"
      }
    ],
    "stats": {
      "totalSessions": 5,
      "activeSessions": 3,
      "config": {
        "maxMessages": 20,
        "sessionTimeout": 1800000
      }
    }
  }
}
```

---

## 用户配置

### 创建/更新用户配置

**POST** `/user/profile`

创建或更新用户的个人配置信息。

**请求体：**
```json
{
  "userId": "user123",
  "basicInfo": {
    "gender": "male",
    "age": 25,
    "height": 175,
    "weight": 80,
    "targetWeight": 70
  },
  "preferences": {
    "dietType": "balanced",
    "exerciseLevel": "beginner",
    "restrictions": ["海鲜过敏"]
  },
  "goals": {
    "primaryGoal": "lose_weight",
    "weeklyGoal": 0.5
  }
}
```

**字段说明：**
- `gender`: "male" | "female"
- `dietType`: "balanced" | "keto" | "vegan" | "low_carb"
- `exerciseLevel`: "beginner" | "intermediate" | "advanced"
- `primaryGoal`: "lose_weight" | "gain_muscle" | "maintain"

**响应：**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "basicInfo": { ... },
    "preferences": { ... },
    "goals": { ... },
    "progress": {
      "weightHistory": [],
      "exerciseHistory": []
    },
    "createdAt": 1725350400000,
    "updatedAt": 1725350400000
  },
  "message": "用户配置已保存"
}
```

---

### 获取用户配置

**GET** `/user/:userId/profile`

获取指定用户的配置信息。

**响应：**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "basicInfo": { ... },
    "preferences": { ... },
    "goals": { ... },
    "progress": { ... }
  }
}
```

---

### 记录体重

**POST** `/user/:userId/weight`

记录用户的体重数据。

**请求体：**
```json
{
  "weight": 79.5,
  "date": "2026-09-03"  // 可选，默认为今天
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "date": "2026-09-03",
    "weight": 79.5,
    "timestamp": 1725350400000
  },
  "message": "体重记录成功"
}
```

---

### 记录运动

**POST** `/user/:userId/exercise`

记录用户的运动数据。

**请求体：**
```json
{
  "type": "HIIT",
  "duration": 30,
  "calories": 250,
  "date": "2026-09-03",
  "notes": "高强度间歇训练"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "date": "2026-09-03",
    "type": "HIIT",
    "duration": 30,
    "calories": 250,
    "notes": "高强度间歇训练",
    "timestamp": 1725350400000
  },
  "message": "运动记录成功"
}
```

---

### 获取用户进度统计

**GET** `/user/:userId/stats`

获取用户的进度统计信息。

**响应：**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "currentWeight": 79,
    "targetWeight": 70,
    "startWeight": 80,
    "weightChange": -1.0,
    "goalProgress": 11,
    "totalWeightRecords": 5,
    "totalExercises": 10,
    "recentExercises": 3,
    "lastUpdated": "2026-09-03T08:00:00.000Z"
  }
}
```

---

### 删除用户配置

**DELETE** `/user/:userId/profile`

删除指定用户的所有配置和数据。

**响应：**
```json
{
  "success": true,
  "message": "用户配置已删除"
}
```

---

## 对话接口

### AI对话

**POST** `/agent/chat`

与AI Agent进行对话。支持会话管理和上下文记忆。

**请求体：**
```json
{
  "message": "我想了解生酮饮食",
  "userId": "user123",
  "sessionId": "ef6c3b5a-6ab6-4155-9521-4b1d57eded1a"  // 可选
}
```

**响应：**
```json
{
  "reply": "生酮饮食是一种极低碳水、高脂肪的饮食方式...",
  "intent": "nutrition",
  "agent": "nutrition_agent",
  "knowledgeUsed": 3,
  "duration": 1500,
  "sessionId": "ef6c3b5a-6ab6-4155-9521-4b1d57eded1a",
  "error": false
}
```

**说明：**
- 如果不提供 `sessionId`，系统会自动创建新会话
- 如果提供的 `sessionId` 已过期，系统会创建新会话
- 系统会自动注入用户配置和对话历史到AI上下文

---

### 获取指标

**GET** `/agent/metrics`

获取AI Agent的运行指标。

**响应：**
```json
{
  "agentCalls": {
    "nutrition_agent": 50,
    "fitness_agent": 30,
    "general_agent": 20
  },
  "llmCalls": {
    "glm-4-flash": 100
  },
  "ragQueries": 80,
  "averageResponseTime": 1200
}
```

---

## 工具接口

### 计算工具

**POST** `/tools/calculate`

执行各种健康计算（BMR、TDEE、体脂率、热量缺口等）。

**请求体示例1 - 计算BMR：**
```json
{
  "calc_type": "bmr",
  "gender": "male",
  "age": 25,
  "height": 175,
  "weight": 80
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "bmr": 1837,
    "formula": "Mifflin-St Jeor",
    "description": "基础代谢率（BMR）是身体在完全休息状态下维持生命所需的最低热量"
  }
}
```

**请求体示例2 - 计算TDEE：**
```json
{
  "calc_type": "tdee",
  "gender": "male",
  "age": 25,
  "height": 175,
  "weight": 80,
  "activity_level": 1.5
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "bmr": 1837,
    "tdee": 2756,
    "activity_level": 1.5,
    "activity_description": "中度活动（每周3-5次中等强度运动）",
    "description": "每日总消耗（TDEE）= 基础代谢率 × 活动系数"
  }
}
```

**请求体示例3 - 计算热量缺口：**
```json
{
  "calc_type": "deficit",
  "gender": "male",
  "age": 25,
  "height": 175,
  "weight": 80,
  "activity_level": 1.5,
  "goal": "lose_weight_moderate"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "tdee": 2756,
    "targetCalories": 2256,
    "deficit": 500,
    "estimatedWeeklyLoss": 0.45,
    "macros": {
      "protein": {
        "grams": 169,
        "calories": 677,
        "ratio": 0.3
      },
      "carbs": {
        "grams": 226,
        "calories": 902,
        "ratio": 0.4
      },
      "fat": {
        "grams": 75,
        "calories": 677,
        "ratio": 0.3
      }
    },
    "recommendations": "建议每周减重0.5-0.75kg，需配合适量运动"
  }
}
```

**calc_type 选项：**
- `bmr` - 基础代谢率
- `tdee` - 每日总消耗
- `body_fat` - 体脂率估算
- `deficit` - 热量缺口和宏量营养素
- `macros` - 宏量营养素分配

**goal 选项：**
- `lose_weight_slow` - 慢速减脂
- `lose_weight_moderate` - 中速减脂
- `lose_weight_fast` - 快速减脂
- `maintain` - 维持体重
- `gain_muscle` - 增肌

**activity_level 选项：**
- `1.2` - 久坐
- `1.375` - 轻度活动
- `1.5` - 中度活动
- `1.725` - 高度活动
- `1.9` - 极高活动

---

### 食物查询

**POST** `/tools/food/query`

查询食物的营养成分。

**请求体：**
```json
{
  "food_name": "鸡胸肉",
  "amount": 150
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "food_name": "鸡胸肉",
    "amount": 150,
    "unit": "g",
    "category": "蛋白质",
    "nutrition": {
      "calories": 200,
      "protein": 36.9,
      "carbs": 3.8,
      "fat": 7.5
    },
    "per_100g": {
      "calories": 133,
      "protein": 24.6,
      "carbs": 2.5,
      "fat": 5.0
    },
    "evaluation": {
      "calorie_level": "低热量",
      "protein_level": "高蛋白",
      "suitability": "优质蛋白质来源，适合减脂和增肌"
    }
  }
}
```

---

### 获取食物列表

**GET** `/tools/food/list`

获取所有可查询的食物列表（按类别分组）。

**响应：**
```json
{
  "success": true,
  "data": {
    "主食": ["米饭", "馒头", "面条", "燕麦"],
    "蛋白质": ["鸡胸肉", "牛肉", "鱼肉", "鸡蛋"],
    "蔬菜": ["西兰花", "菠菜", "番茄", "黄瓜"],
    "水果": ["苹果", "香蕉", "橙子", "西瓜"],
    "坚果": ["杏仁", "核桃", "花生", "腰果"]
  }
}
```

---

## 系统接口

### 健康检查

**GET** `/health`

检查系统健康状态。

**响应：**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "memory": {
      "rss": 52428800,
      "heapTotal": 20971520,
      "heapUsed": 15728640
    },
    "timestamp": "2026-09-03T08:00:00.000Z"
  }
}
```

---

### 系统统计

**GET** `/system/stats`

获取系统运行统计信息。

**响应：**
```json
{
  "success": true,
  "data": {
    "sessions": {
      "totalSessions": 10,
      "activeSessions": 5,
      "config": {
        "maxMessages": 20,
        "sessionTimeout": 1800000
      }
    },
    "metrics": {
      "agentCalls": { ... },
      "llmCalls": { ... },
      "ragQueries": 100
    },
    "uptime": 3600
  }
}
```

---

## 错误码

| 状态码 | 说明 |
|-------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 使用示例

### 完整对话流程

```javascript
// 1. 创建会话
const sessionRes = await fetch('http://localhost:3000/api/session/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'user123' })
});
const { data: { sessionId } } = await sessionRes.json();

// 2. 创建用户配置
await fetch('http://localhost:3000/api/user/profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    basicInfo: {
      gender: 'male',
      age: 25,
      height: 175,
      weight: 80,
      targetWeight: 70
    }
  })
});

// 3. 开始对话
const chatRes = await fetch('http://localhost:3000/api/agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: '我想减肥，怎么开始？',
    userId: 'user123',
    sessionId
  })
});
const chatData = await chatRes.json();
console.log(chatData.reply);

// 4. 继续对话（自动携带上下文）
const chat2Res = await fetch('http://localhost:3000/api/agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: '生酮饮食适合我吗？',
    userId: 'user123',
    sessionId
  })
});
```

---

## 更新日志

### v1.0.0 (2026-09-03)
- ✅ 会话管理API
- ✅ 用户配置API
- ✅ 对话接口（支持会话）
- ✅ 工具接口（计算、食物查询）
- ✅ 系统接口（健康检查、统计）
