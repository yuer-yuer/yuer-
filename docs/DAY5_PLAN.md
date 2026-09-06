# Day 5：对话管理和记忆系统

**日期：** 2026-09-03  
**预计时间：** 4小时  
**状态：** 进行中

---

## 任务清单

### 1. 会话管理（1.5h）
- [ ] 会话存储（内存/Redis）
- [ ] 会话生命周期管理
- [ ] 多用户会话隔离
- [ ] 会话元数据（创建时间、最后活跃等）

### 2. 对话历史管理（1h）
- [ ] 对话历史存储
- [ ] 历史压缩和摘要
- [ ] 上下文窗口管理（保留最近N轮）
- [ ] 历史检索功能

### 3. 用户记忆系统（1h）
- [ ] 用户配置文件（身高、体重、目标等）
- [ ] 偏好记忆（饮食习惯、运动偏好）
- [ ] 进度追踪（体重变化、训练记录）
- [ ] 持久化存储（SQLite/JSON）

### 4. 上下文注入（0.5h）
- [ ] 将历史对话注入Agent
- [ ] 将用户信息注入Prompt
- [ ] 智能上下文选择（相关性筛选）

---

## 实施方案

### 会话管理架构

```javascript
Session {
  sessionId: string,
  userId: string,
  createdAt: timestamp,
  lastActiveAt: timestamp,
  messages: Message[],
  userProfile: UserProfile,
  metadata: {}
}
```

### 对话历史策略

**存储方案：**
- 短期：内存存储（当前会话）
- 长期：SQLite数据库（历史会话）

**压缩策略：**
- 保留最近10轮完整对话
- 更早的对话生成摘要
- 重要信息永久保留（用户数据、目标等）

### 用户记忆模型

```javascript
UserProfile {
  userId: string,
  basicInfo: {
    gender: 'male' | 'female',
    age: number,
    height: number,
    weight: number,
    targetWeight: number,
  },
  preferences: {
    dietType: 'balanced' | 'keto' | 'vegan',
    exerciseLevel: 'beginner' | 'intermediate' | 'advanced',
    restrictions: string[],
  },
  progress: {
    weightHistory: {date, weight}[],
    exerciseHistory: {date, type, duration}[],
  }
}
```

---

## 文件结构

```
session/
├── manager.js          # 会话管理器
├── history.js          # 对话历史管理
├── userProfile.js      # 用户配置管理
└── context.js          # 上下文构建器

storage/
├── sessionStore.js     # 会话存储（内存+Redis）
├── userStore.js        # 用户数据存储（SQLite）
└── historyStore.js     # 历史对话存储（SQLite）
```

---

## API设计

### 1. 会话管理
```javascript
// 创建会话
POST /api/session/create
Request: { userId: string }
Response: { sessionId: string }

// 获取会话
GET /api/session/:sessionId

// 结束会话
POST /api/session/:sessionId/close
```

### 2. 对话接口（更新）
```javascript
// 发送消息（带会话支持）
POST /api/agent/chat
Request: {
  sessionId: string,
  message: string
}
Response: {
  reply: string,
  intent: string,
  sessionId: string
}
```

### 3. 用户管理
```javascript
// 创建/更新用户配置
POST /api/user/profile
Request: { userId, basicInfo, preferences }

// 获取用户配置
GET /api/user/:userId/profile

// 记录进度
POST /api/user/:userId/progress
Request: { type: 'weight' | 'exercise', data }
```

---

## 实现优先级

### P0（必须完成）
1. ✅ 基础会话管理（内存存储）
2. ✅ 对话历史存储和检索
3. ✅ 用户基本信息管理
4. ✅ 上下文注入到Agent

### P1（时间允许）
1. Redis会话持久化
2. SQLite历史存储
3. 对话摘要生成
4. 用户进度追踪

### P2（可选）
1. 多租户支持
2. 会话共享功能
3. 对话导出功能

---

## 测试计划

### 单元测试
- [ ] 会话创建和管理
- [ ] 历史对话存储和检索
- [ ] 用户配置CRUD
- [ ] 上下文构建

### 集成测试
- [ ] 多轮对话测试
- [ ] 上下文连贯性测试
- [ ] 用户信息正确注入

---

**下一步：** 开始实现会话管理器
