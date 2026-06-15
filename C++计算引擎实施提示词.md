# ⚙️ C++ 计算引擎实施提示词

> 为「慢慢瘦」新增 C++ 核心计算模块，通过 IPC 与 Node.js 服务层集成，提升简历含金量

---

## 一、整体架构

```
┌─────────────────────────────────────────────┐
│              慢慢瘦 前端 (SPA)               │
└─────────────────┬───────────────────────────┘
                  │ HTTP 请求
┌─────────────────▼───────────────────────────┐
│           Node.js 服务层 (server.js)         │
│   /api/calc/* 路由 → child_process.execFile  │
└─────────────────┬───────────────────────────┘
                  │ stdin JSON / stdout JSON
┌─────────────────▼───────────────────────────┐
│         C++ 计算引擎 (calc_engine)           │
│   BMR / TDEE / BMI / MET / 减脂计划         │
└─────────────────────────────────────────────┘
```

**集成方式**：Node.js 通过 `child_process.execFile` 调用编译好的二进制文件，
以 JSON 字符串作为 stdin 输入，从 stdout 读取 JSON 结果。

---

## 二、文件结构

```
慢慢瘦/
├── cpp_engine/
│   ├── src/
│   │   ├── main.cpp          # 程序入口，读取stdin JSON，分发计算
│   │   ├── calculator.h      # 计算函数声明
│   │   ├── calculator.cpp    # 计算函数实现
│   │   └── json.hpp          # nlohmann/json 单头文件（v3.11+）
│   ├── build/
│   │   └── calc_engine.exe   # 编译产物（Windows）
│   │   └── calc_engine       # 编译产物（Linux/macOS）
│   ├── CMakeLists.txt        # CMake 构建文件
│   └── README.md             # 模块说明
├── server.js                 # 新增 /api/calc 路由调用引擎
└── ...
```

---

## 三、C++ 计算模块实现

### 3.1 支持的计算指令

通过 JSON 字段 `"action"` 区分：

| action | 功能 | 必要输入字段 |
|--------|------|-------------|
| `"bmr"` | 基础代谢率（Mifflin-St Jeor公式） | weight, height, age, gender |
| `"tdee"` | 每日总消耗（BMR × 活动系数） | weight, height, age, gender, activity_level |
| `"bmi"` | 体重指数及分级 | weight, height |
| `"met_calories"` | 运动消耗热量（MET公式） | weight, met, duration_min |
| `"weight_plan"` | 减脂计划（目标周数/每日缺口） | current_weight, target_weight, tdee |
| `"macro"` | 三大营养素推荐摄入 | tdee, goal（reduce/maintain/gain） |

### 3.2 输入/输出 JSON 格式

**输入（stdin）：**
```json
{
  "action": "tdee",
  "weight": 65.5,
  "height": 175,
  "age": 22,
  "gender": "male",
  "activity_level": 2
}
```

**输出（stdout）：**
```json
{
  "success": true,
  "action": "tdee",
  "result": {
    "bmr": 1721.25,
    "tdee": 2668.94,
    "activity_label": "轻度活动"
  }
}
```

**错误输出：**
```json
{
  "success": false,
  "error": "缺少必要字段: weight"
}
```

### 3.3 核心公式实现

**BMR（Mifflin-St Jeor 公式）：**
```
男性：BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 + 5
女性：BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 - 161
```

**TDEE（活动系数）：**
```
1 = 久坐不动（× 1.2）
2 = 轻度活动，每周1-3天（× 1.375）
3 = 中度活动，每周3-5天（× 1.55）
4 = 高强度，每周6-7天（× 1.725）
5 = 极高强度，体力劳动（× 1.9）
```

**MET 运动消耗：**
```
消耗热量(kcal) = MET × 体重(kg) × 时间(h)
```

**BMI 分级（中国标准）：**
```
< 18.5 = 偏瘦
18.5 - 23.9 = 正常
24.0 - 27.9 = 超重
≥ 28.0 = 肥胖
```

**减脂计划：**
```
每日热量缺口 = TDEE × 20%（保守减脂，最大不超过500kcal）
理论减脂速率 = 每日缺口 × 7 / 7700（kg/周）（7700kcal = 1kg脂肪）
完成周数 = (当前体重 - 目标体重) / 周减脂量
```

**三大营养素（减脂目标）：**
```
蛋白质：体重(kg) × 2g，1g = 4kcal
脂肪：总热量 × 25%，1g = 9kcal
碳水：剩余热量，1g = 4kcal
```

---

## 四、main.cpp 程序流程

```
程序启动
  │
  ├─ 从 stdin 读取全部内容
  ├─ 用 nlohmann/json 解析
  ├─ 检查 "action" 字段是否存在
  │
  ├─ switch(action)
  │     ├─ "bmr"         → calcBMR()
  │     ├─ "tdee"        → calcTDEE()
  │     ├─ "bmi"         → calcBMI()
  │     ├─ "met_calories"→ calcMETCalories()
  │     ├─ "weight_plan" → calcWeightPlan()
  │     ├─ "macro"       → calcMacro()
  │     └─ default       → 返回错误JSON
  │
  └─ 将结果序列化为 JSON 输出到 stdout
     程序退出（exit code 0）
```

异常处理：所有异常用 try-catch 捕获，以 `{"success":false,"error":"..."}` 格式输出，**不能崩溃**。

---

## 五、CMakeLists.txt 配置

```cmake
cmake_minimum_required(VERSION 3.16)
project(calc_engine)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Release模式，优化编译体积和速度
set(CMAKE_BUILD_TYPE Release)
add_compile_options(-O2)

include_directories(src)

add_executable(calc_engine
    src/main.cpp
    src/calculator.cpp
)

# Windows下关闭控制台窗口弹出（可选）
# if(WIN32)
#     target_link_options(calc_engine PRIVATE -mwindows)
# endif()
```

编译命令：
```bash
cd cpp_engine
mkdir build && cd build
cmake ..
cmake --build . --config Release
```

---

## 六、Node.js 集成层（server.js 新增路由）

### 新增 /api/calc 路由

```javascript
// 在 server.js 中新增，放在其他路由之后

const { execFile } = require('child_process');
const path = require('path');

// 引擎路径（根据平台选择）
const ENGINE_PATH = path.join(__dirname, 'cpp_engine', 'build',
  process.platform === 'win32' ? 'Release/calc_engine.exe' : 'calc_engine'
);

// 调用C++引擎的通用函数
function callEngine(inputData) {
  return new Promise((resolve, reject) => {
    const proc = execFile(ENGINE_PATH, [], {
      timeout: 5000  // 超时5秒
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`引擎调用失败: ${error.message}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error(`结果解析失败: ${stdout}`));
      }
    });
    // 写入输入数据
    proc.stdin.write(JSON.stringify(inputData));
    proc.stdin.end();
  });
}

// POST /api/calc
app.post('/api/calc', async (req, res) => {
  try {
    const result = await callEngine(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
```

### 前端调用示例

```javascript
// 计算TDEE
async function calculateTDEE(userInfo) {
  const res = await fetch('/api/calc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'tdee',
      weight: userInfo.weight,
      height: userInfo.height,
      age: userInfo.age,
      gender: userInfo.gender,
      activity_level: userInfo.activityLevel
    })
  });
  return res.json();
}

// 结果展示（新粗野主义风格卡片）
// result.result.bmr → BMR数值
// result.result.tdee → TDEE数值
// result.result.activity_label → 活动等级描述
```

---

## 七、UI 展示位置（身体档案面板）

在"我的"Tab → 身体档案底部滑出面板中，新增一个**计算结果卡片区**：

```
┌──────────────────────────────────────┐  ← 3px黑边框，硬阴影
│  ⚙️ 精准计算（C++引擎）              │
├──────────┬───────────┬───────────────┤
│  BMR     │   TDEE    │    BMI        │
│ 1721     │  2669     │   21.4        │
│ kcal/天  │ kcal/天   │  ✅ 正常      │
└──────────┴───────────┴───────────────┘

┌──────────────────────────────────────┐
│  📊 减脂计划                         │
│  目标：65kg → 58kg                   │
│  预计需要：11.2 周                   │
│  建议每日摄入：2169 kcal             │
│  每日缺口：500 kcal                  │
└──────────────────────────────────────┘
```

所有数字加粗放大（32-40px），卡片样式遵循新粗野主义规范。

---

## 八、README.md 简历包装要点

在 `cpp_engine/README.md` 中写明：

1. **为什么用C++**：浮点计算精度、性能、工程规范（体现C++能力）
2. **技术亮点**：nlohmann/json 库使用、CMake 构建、跨平台编译
3. **与 Node.js 集成方式**：IPC/stdin-stdout，避免外部依赖
4. **公式来源**：注明使用 Mifflin-St Jeor 公式（有学术依据）
5. **扩展性**：预留接口，后续可编译为 WebAssembly 在前端直接调用

---

## 九、扩展方向（可选）

实现完基础版后，如有余力：

1. **编译为 WASM** — 用 Emscripten 编译，前端直接 `import`，不走服务器
2. **批量计算接口** — 一次调用计算多个指标，减少进程启动开销
3. **单元测试** — 用 Google Test / Catch2 写测试用例，验证公式正确性
4. **CI 编译** — GitHub Actions 自动编译，检查代码通过

---

## 十、简历描述模板

```
核心计算模块（BMR/TDEE/MET/减脂计划）使用 C++17 实现：
- 采用 CMake 管理构建流程，支持 Windows/Linux 跨平台编译
- 通过 nlohmann/json 处理 JSON 序列化，与 Node.js 服务层
  经由 IPC（stdin/stdout）通信集成
- 实现 Mifflin-St Jeor 基础代谢公式、MET 运动消耗模型等
  6种健康计算指令，保证浮点精度和性能
```
