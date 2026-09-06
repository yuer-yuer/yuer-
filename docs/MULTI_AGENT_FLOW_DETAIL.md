# Multi-Agent架构流程详解

## 🎭 三个Agent的职责划分

### 1. Nutrition Agent (营养专家)
**职责**：
- 回答营养相关问题
- 分析饮食搭配
- 提供营养建议
- 计算营养成分

**使用场景**：
- "减肥期间可以吃鸡蛋吗？"
- "晚上吃什么不会胖？"
- "这个食物热量高吗？"
- "帮我分析今天的饮食是否健康"

### 2. Fitness Agent (运动教练)
**职责**：
- 回答运动相关问题
- 制定训练计划
- 提供运动指导
- 分析运动效果

**使用场景**：
- "怎么练腹肌？"
- "跑步多久能减肥？"
- "适合新手的运动有哪些？"
- "帮我分析今天的运动量"

### 3. Tool Agent (工具执行专员)
**职责**：
- 记录数据（饮食/运动/体重）
- 查询数据（今日汇总/历史记录）
- 搜索食物数据库
- 执行所有工具操作

**使用场景**：
- "记录早餐：鸡蛋60克"
- "查询今天吃了什么"
- "记录体重70公斤"
- "帮我查一下鸡蛋的热量"

---

## 🔄 完整架构流程

### 单Agent场景流程

```
场景1: 纯咨询（无需Agent协作）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

用户输入: "减肥期间可以吃鸡蛋吗？"
    ↓
┌──────────────────────────────────────┐
│ Manager Agent (路由)                  │
│  - 识别意图: nutrition                │
│  - 选择Agent: Nutrition Agent         │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ Nutrition Agent 独立处理              │
│  1. RAG检索营养知识                   │
│  2. LLM推理生成回答                   │
│  3. 返回结果                          │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ Manager Agent (汇总)                  │
│  - 直接返回Nutrition Agent的结果      │
└──────────────────────────────────────┘
    ↓
响应给用户: "鸡蛋是优质蛋白来源，减肥期间可以吃..."
```

```
场景2: 纯工具调用（无需Agent协作）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

用户输入: "记录早餐：鸡蛋60克，156卡/100克"
    ↓
┌──────────────────────────────────────┐
│ Manager Agent (路由)                  │
│  - 识别关键词: "记录"                 │
│  - 选择Agent: Tool Agent              │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ Tool Agent 独立处理                   │
│  1. LLM识别需要调用log_meal          │
│  2. 执行工具：插入数据库              │
│  3. 生成友好回复                      │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ Manager Agent (汇总)                  │
│  - 直接返回Tool Agent的结果           │
└──────────────────────────────────────┘
    ↓
响应给用户: "✅ 已记录早餐：鸡蛋60克，94卡路里"
```

---

## 🤝 Multi-Agent协作场景

### 场景A: 记录+分析（Tool Agent → Nutrition Agent）

```
用户输入: "我今天吃了鸡蛋，帮我记录并分析营养"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Manager识别需要两个Agent
┌──────────────────────────────────────┐
│ Manager Agent                         │
│  - 识别意图: 记录 + 营养分析          │
│  - 需要Agent: Tool + Nutrition        │
│  - 执行策略: 串行（先记录，再分析）    │
└──────────────────────────────────────┘
    ↓
Step 2: Tool Agent先执行
┌──────────────────────────────────────┐
│ Tool Agent                            │
│  1. 调用log_meal记录鸡蛋              │
│  2. 调用search_food_database查询营养  │
│  3. 返回: {                           │
│      recordId: 56,                    │
│      calories: 94,                    │
│      protein: 7.8g,                   │
│      fat: 6.2g                        │
│    }                                  │
└──────────────────────────────────────┘
    ↓ 通过MessageBus发送消息
    │
    │ Message {
    │   from: 'tool_agent',
    │   to: 'nutrition_agent',
    │   type: 'data_share',
    │   data: { recordId: 56, ... }
    │ }
    ↓
Step 3: Nutrition Agent接收数据并分析
┌──────────────────────────────────────┐
│ Nutrition Agent                       │
│  1. 接收Tool Agent的数据              │
│  2. RAG检索鸡蛋营养知识               │
│  3. 基于实际数据生成分析              │
│  4. 返回: "你记录的鸡蛋含94卡路里...  │
│     蛋白质充足，适合减肥期间食用"     │
└──────────────────────────────────────┘
    ↓
Step 4: Manager汇总结果
┌──────────────────────────────────────┐
│ Manager Agent                         │
│  - 汇总Tool + Nutrition的结果         │
│  - 生成完整回复                       │
└──────────────────────────────────────┘
    ↓
响应给用户:
"✅ 已记录：鸡蛋60克，94卡路里
 📊 营养分析：
 - 蛋白质：7.8g（优质蛋白）
 - 脂肪：6.2g（健康脂肪）
 - 适合减肥期间作为早餐..."
```

### 场景B: 查询+建议（Tool Agent → Nutrition Agent + Fitness Agent）

```
用户输入: "分析我今天的健康数据并给建议"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Manager分解任务
┌──────────────────────────────────────┐
│ Manager Agent                         │
│  任务分解:                            │
│  1. Tool Agent: 查询今日数据          │
│  2. Nutrition Agent: 分析饮食         │
│  3. Fitness Agent: 分析运动           │
│  执行策略: 先串行(1)，再并行(2+3)     │
└──────────────────────────────────────┘
    ↓
Step 2: Tool Agent查询数据
┌──────────────────────────────────────┐
│ Tool Agent                            │
│  调用query_today查询今日汇总           │
│  返回: {                              │
│    foods: [鸡蛋60g, 米饭200g],       │
│    exercises: [跑步30min],           │
│    calories_in: 450,                 │
│    calories_out: 300,                │
│    net: +150                         │
│  }                                   │
└──────────────────────────────────────┘
    ↓ 广播给所有Agent
    │
    │ Message {
    │   from: 'tool_agent',
    │   to: 'all',
    │   type: 'broadcast',
    │   data: { today_data }
    │ }
    ↓
    ├─────────────┬─────────────┐
    ↓             ↓             
Step 3: 并行处理
┌─────────────────┐  ┌─────────────────┐
│Nutrition Agent  │  │Fitness Agent    │
│                 │  │                 │
│分析饮食:        │  │分析运动:        │
│- 热量适中       │  │- 运动量偏少     │
│- 蛋白质充足     │  │- 建议增加力量   │
│- 建议增加蔬菜   │  │  训练           │
└─────────────────┘  └─────────────────┘
    ↓                     ↓
    └─────────┬───────────┘
              ↓
Step 4: Manager汇总
┌──────────────────────────────────────┐
│ Manager Agent                         │
│  整合三个Agent的结果:                 │
│  - 数据 (Tool)                        │
│  - 饮食分析 (Nutrition)               │
│  - 运动分析 (Fitness)                 │
└──────────────────────────────────────┘
    ↓
响应给用户:
"📊 今日健康报告：
 摄入450卡，消耗300卡，净+150卡
 
 🍎 饮食分析（营养专家）:
 - 热量适中，蛋白质充足
 - 建议增加蔬菜摄入
 
 💪 运动分析（运动教练）:
 - 有氧运动不错
 - 建议增加力量训练..."
```

### 场景C: Nutrition Agent主动请求Tool Agent

```
用户输入: "鸡蛋的热量是多少？"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Manager路由到Nutrition
┌──────────────────────────────────────┐
│ Manager Agent                         │
│  - 识别意图: nutrition查询            │
│  - 选择: Nutrition Agent              │
└──────────────────────────────────────┘
    ↓
Step 2: Nutrition Agent发现需要数据
┌──────────────────────────────────────┐
│ Nutrition Agent                       │
│  推理: 需要查询食物数据库             │
│  决策: 请求Tool Agent帮助             │
└──────────────────────────────────────┘
    ↓ 发送请求
    │
    │ Message {
    │   from: 'nutrition_agent',
    │   to: 'tool_agent',
    │   type: 'request',
    │   action: 'search_food_database',
    │   params: { food_name: '鸡蛋' }
    │ }
    ↓
Step 3: Tool Agent响应
┌──────────────────────────────────────┐
│ Tool Agent                            │
│  执行search_food_database              │
│  返回: { calories_per_100g: 156 }     │
└──────────────────────────────────────┘
    ↓ 返回响应
    │
    │ Message {
    │   from: 'tool_agent',
    │   to: 'nutrition_agent',
    │   type: 'response',
    │   data: { calories_per_100g: 156 }
    │ }
    ↓
Step 4: Nutrition Agent继续处理
┌──────────────────────────────────────┐
│ Nutrition Agent                       │
│  基于Tool返回的数据 + RAG知识          │
│  生成完整回答                         │
└──────────────────────────────────────┘
    ↓
响应给用户:
"鸡蛋每100克含156卡路里，
 一个中等大小的鸡蛋约60克，
 约94卡路里。鸡蛋是优质蛋白来源..."
```

---

## 🏗️ 技术实现架构

### 1. 消息总线（MessageBus）

```javascript
class MessageBus extends EventEmitter {
  constructor() {
    super();
    this.agentRegistry = new Map(); // 注册所有Agent
    this.messageQueue = [];         // 消息队列
    this.waitingRequests = new Map(); // 等待响应的请求
  }

  // 点对点发送
  async send(message) {
    const { to, from, type, data } = message;
    
    // 记录消息
    this.messageQueue.push({ ...message, timestamp: Date.now() });
    
    // 触发目标Agent的监听器
    this.emit(`message:${to}`, message);
    
    // 如果是request类型，返回Promise等待响应
    if (type === 'request') {
      return new Promise((resolve) => {
        this.waitingRequests.set(message.id, resolve);
      });
    }
  }

  // 广播给所有Agent
  broadcast(message) {
    this.emit('message:all', message);
  }

  // Agent注册监听
  subscribe(agentName, callback) {
    this.on(`message:${agentName}`, callback);
    this.on('message:all', callback);
  }
}
```

### 2. Agent基类

```javascript
class BaseAgent {
  constructor(name, systemPrompt) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.llm = this.initLLM();
    this.memory = []; // 对话历史
    
    // 订阅消息
    messageBus.subscribe(this.name, (msg) => this.handleMessage(msg));
  }

  // 处理接收到的消息
  async handleMessage(message) {
    if (message.to !== this.name && message.to !== 'all') return;
    
    const { from, type, data } = message;
    
    switch(type) {
      case 'request':
        // 处理请求并返回响应
        const result = await this.handleRequest(data);
        messageBus.send({
          from: this.name,
          to: from,
          type: 'response',
          data: result,
          requestId: message.id
        });
        break;
        
      case 'data_share':
        // 接收共享数据
        this.sharedData = { ...this.sharedData, ...data };
        break;
        
      case 'broadcast':
        // 接收广播数据
        this.handleBroadcast(data);
        break;
    }
  }

  // 发送请求给其他Agent
  async requestFromAgent(targetAgent, action, params) {
    const message = {
      id: `req_${Date.now()}`,
      from: this.name,
      to: targetAgent,
      type: 'request',
      action: action,
      params: params
    };
    
    return await messageBus.send(message);
  }

  // 主处理方法
  async process(input, context) {
    // 子类实现
  }
}
```

### 3. Manager Agent编排逻辑

```javascript
class ManagerAgent {
  constructor() {
    this.agents = {
      nutrition: new NutritionAgent(),
      fitness: new FitnessAgent(),
      tool: new ToolAgent()
    };
  }

  async orchestrate(userQuery, context) {
    // 1. 分析任务
    const analysis = await this.analyzeTask(userQuery);
    
    // 2. 制定执行计划
    const plan = this.createExecutionPlan(analysis);
    
    // 3. 执行计划
    const results = await this.executePlan(plan, context);
    
    // 4. 汇总结果
    return this.aggregateResults(results);
  }

  createExecutionPlan(analysis) {
    const { needsData, needsNutrition, needsFitness } = analysis;
    
    // 串行计划
    if (needsData && (needsNutrition || needsFitness)) {
      return {
        type: 'sequential',
        steps: [
          { agent: 'tool', parallel: false },
          { agent: ['nutrition', 'fitness'], parallel: true }
        ]
      };
    }
    
    // 并行计划
    if (needsNutrition && needsFitness) {
      return {
        type: 'parallel',
        agents: ['nutrition', 'fitness']
      };
    }
    
    // 单Agent
    return {
      type: 'single',
      agent: needsData ? 'tool' : (needsNutrition ? 'nutrition' : 'fitness')
    };
  }

  async executePlan(plan, context) {
    if (plan.type === 'single') {
      return await this.agents[plan.agent].process(context);
    }
    
    if (plan.type === 'parallel') {
      return await Promise.all(
        plan.agents.map(a => this.agents[a].process(context))
      );
    }
    
    if (plan.type === 'sequential') {
      const results = [];
      for (const step of plan.steps) {
        if (step.parallel) {
          const stepResults = await Promise.all(
            step.agent.map(a => this.agents[a].process(context))
          );
          results.push(...stepResults);
        } else {
          const result = await this.agents[step.agent].process(context);
          results.push(result);
          // 更新context，供后续Agent使用
          context.previousResults = result;
        }
      }
      return results;
    }
  }
}
```

---

## 📊 流程总结表

| 场景 | Manager决策 | Agent执行 | Agent通信 | 执行模式 |
|------|------------|----------|----------|---------|
| 纯咨询（营养） | → Nutrition | Nutrition独立处理 | 无 | 单Agent |
| 纯咨询（运动） | → Fitness | Fitness独立处理 | 无 | 单Agent |
| 记录数据 | → Tool | Tool独立处理 | 无 | 单Agent |
| 记录+分析 | → Tool + Nutrition | Tool先执行→Nutrition接收数据 | Tool→Nutrition | 串行 |
| 综合分析 | → Tool + Nutrition + Fitness | Tool先执行→N&F并行分析 | Tool→All | 串行+并行 |
| 咨询需要数据 | → Nutrition | Nutrition请求Tool→继续处理 | Nutrition→Tool→Nutrition | Agent间协作 |

---

## 🎯 关键点总结

1. **Manager是大脑** - 负责任务分析、Agent选择、执行编排
2. **Agent是专家** - 各自专注自己的领域，可独立工作也可协作
3. **MessageBus是神经系统** - 负责Agent间的所有通信
4. **执行模式灵活** - 支持单Agent、并行、串行、Agent间协作
5. **状态共享** - 通过消息传递或共享黑板实现数据共享

这就是完整的Multi-Agent架构！
