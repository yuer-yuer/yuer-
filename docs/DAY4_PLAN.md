# Day 4：Tool Calling工具调用

**日期：** 2026-09-03  
**预计时间：** 4小时  
**状态：** 进行中

---

## 任务清单

### 1. 定义Tool Schema（1h）
- [ ] knowledge_retrieval_tool（RAG检索）- 已有基础
- [ ] calc_engine_tool（计算引擎：BMR、TDEE、体脂率）
- [ ] food_query_tool（食物营养查询）
- [ ] meal_planner_tool（饮食方案生成）
- [ ] exercise_planner_tool（运动方案生成）

### 2. 实现Tool执行器（2h）
- [ ] tools/knowledge.js - RAG检索
- [ ] tools/calculator.js - 计算引擎
- [ ] tools/food.js - 食物数据库
- [ ] tools/planner.js - 方案生成器
- [ ] tools/index.js - 统一导出

### 3. 集成到Agent节点（1h）
- [ ] 更新nutrition.js支持Tool调用
- [ ] 更新fitness.js支持Tool调用
- [ ] Tool调用结果处理
- [ ] 错误处理和降级

---

## 实施策略

### 简化方案（推荐）
由于智谱GLM-4-Flash不支持原生Function Calling，采用：
1. **基于提示词的Tool选择**
   - 在System Prompt中列出可用工具
   - LLM返回JSON格式的工具调用指令
   - 解析JSON并执行相应工具

2. **预定义工具集**
   - 每个Agent有自己的工具集
   - 营养Agent：knowledge_retrieval, calc_engine, food_query, meal_planner
   - 运动Agent：knowledge_retrieval, calc_engine, exercise_planner

3. **工具执行流程**
   ```
   用户输入 → Agent思考 → 返回工具调用JSON → 执行工具 → 将结果注入Prompt → Agent生成最终回复
   ```

---

## Tool定义

### Tool 1: knowledge_retrieval_tool
**功能：** RAG知识检索（已有）  
**参数：**
- query: 查询文本
- category: nutrition/fitness/null

**示例：**
```json
{
  "tool": "knowledge_retrieval",
  "params": {
    "query": "生酮饮食的原理",
    "category": "nutrition"
  }
}
```

### Tool 2: calc_engine_tool
**功能：** 计算BMR、TDEE、体脂率、热量缺口  
**参数：**
- calc_type: "bmr" | "tdee" | "body_fat" | "deficit"
- gender: "male" | "female"
- age: number
- height: number (cm)
- weight: number (kg)
- activity_level: 1.2-1.9
- body_fat (可选)

**示例：**
```json
{
  "tool": "calc_engine",
  "params": {
    "calc_type": "tdee",
    "gender": "male",
    "age": 25,
    "height": 175,
    "weight": 75,
    "activity_level": 1.5
  }
}
```

### Tool 3: food_query_tool
**功能：** 查询食物营养成分  
**参数：**
- food_name: 食物名称
- amount: 重量（克，默认100）

**示例：**
```json
{
  "tool": "food_query",
  "params": {
    "food_name": "苹果",
    "amount": 100
  }
}
```

### Tool 4: meal_planner_tool
**功能：** 生成饮食方案  
**参数：**
- goal: "lose_weight" | "gain_muscle" | "maintain"
- tdee: 每日总消耗
- protein_ratio: 蛋白质比例
- carb_ratio: 碳水比例
- fat_ratio: 脂肪比例

### Tool 5: exercise_planner_tool
**功能：** 生成运动方案  
**参数：**
- goal: "lose_weight" | "gain_muscle" | "endurance"
- level: "beginner" | "intermediate" | "advanced"
- days_per_week: 3-7

---

## 下一步
开始实现Tool执行器
