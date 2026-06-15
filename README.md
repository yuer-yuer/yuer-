# 慢慢瘦

慢慢瘦是一款移动端优先的减脂健康助手 PWA。项目围绕饮食记录、运动消耗、体重目标、今日计划、AI 拍照识别和 AI 私教“小瘦”提供日常减脂管理体验。

当前项目采用 Node.js + Express + SQLite 后端，前端为原生 HTML/CSS/JavaScript 单页应用，可作为 PWA 安装到手机桌面。项目还引入了一个 C++ 计算引擎，用于承载 BMI、BMR、TDEE、运动消耗和减脂计划等核心计算。

## 当前更新

相较早期版本，当前工作区已经加入或更新了这些能力：

- 新用户引导：首次进入时收集性别、年龄、身高、当前体重、目标体重、目标日期和活动等级，并写入个人资料。
- C++ 计算引擎：新增 `cpp_engine/`，通过 stdin/stdout 与 Node.js 集成，提供健康指标计算。
- “我能吃吗”食物沙盒：可手动输入、拍照识别或 AI 估算热量，判断吃完后是否会超出今日预算，并给出替换和运动补救建议。
- 食物热量估算：优先匹配本地食物库，未命中时可调用 AI 估算每 100g 热量。
- AI 私教流式回复：支持 `stream=1` 的文本流输出，提升聊天响应体验。
- PWA 缓存更新：Service Worker 缓存版本升级，并加入新的前端脚本。
- 测试补充：新增 C++ 引擎、食物沙盒、热量估算和流式解析相关测试。

## 核心功能

- 饮食记录：三餐记录、常用食物、自定义食物、热量和营养信息管理。
- AI 拍照记录：上传或拍摄餐食图片，后端调用视觉模型识别食物、分量、热量和营养信息。
- 我能吃吗：基于今日已摄入、已消耗、目标热量和待吃食物进行预算推演。
- 运动模块：运动记录、运动消耗、训练计时、语音倒计时。
- 用户模块：体重目标、BMI/BMR 指标、近期趋势、头像上传、提醒设置。
- AI 私教“小瘦”：根据用户数据进行问候、建议、计划生成和本地规则兜底回复。
- 今日计划清单：添加、完成、删除、过期、撤销删除，并支持小瘦一键生成今日计划。
- PWA：支持 Manifest、Service Worker、离线缓存和添加到主屏幕。

## 技术栈

- Backend: Node.js, Express
- Database: SQLite, better-sqlite3
- Auth: express-session, bcryptjs
- Frontend: Vanilla JavaScript, HTML, CSS
- Native engine: C++17
- PWA: Manifest, Service Worker
- AI: 智谱 GLM / 兼容视觉模型接口

## 本地运行

安装依赖：

```bash
npm install
```

复制环境变量示例：

```bash
copy .env.example .env
```

启动服务：

```bash
npm start
```

或使用重启脚本：

```bash
npm run restart
```

默认访问地址：

```text
http://localhost:3000
```

## HTTPS 临时通道

本地服务启动后，可用 Cloudflare Tunnel 暴露 HTTPS 地址：

```powershell
& "C:\Users\86188\Downloads\cloudflared.exe" tunnel --url http://localhost:3000
```

如果文件名或位置不同，请替换为实际的 `cloudflared.exe` 路径。

## 环境变量

`.env` 不应提交到 Git。请在本地或服务器环境中配置：

```env
SESSION_SECRET=replace_with_a_strong_secret
ZHIPU_API_KEY=replace_with_your_zhipu_api_key
ZHIPU_VISION_MODEL=glm-4v-flash
ZHIPU_CHAT_MODEL=glm-4-flash
```

可选调试变量：

```env
AI_MOCK=1
```

AI Key 必须只放在服务端，不能写入前端代码、PWA 缓存或打包后的 App 客户端。

## 项目结构

```text
.
├── server.js                  # Express API、SQLite 初始化和 AI 服务编排
├── lib/                       # 可复用业务逻辑
│   ├── coach-core.js          # AI 私教本地规则和上下文构建
│   ├── coach-stream.js        # 流式回复解析和文本分块
│   ├── fat-loss-sandbox.js    # “我能吃吗”预算推演
│   └── food-calorie-estimator.js
├── cpp_engine/                # C++17 健康计算引擎
├── public/                    # 前端静态资源
│   ├── index.html
│   ├── css/
│   ├── js/
│   ├── images/
│   ├── manifest.webmanifest
│   └── sw.js
├── scripts/                   # 开发脚本
├── tests/                     # Node 测试
├── data/                      # 本地 SQLite 数据库，已忽略
└── docs/                      # 实施计划和项目文档
```

## C++ 计算引擎

引擎源码位于 `cpp_engine/`。构建方式：

```bash
cmake -S cpp_engine -B cpp_engine/build
cmake --build cpp_engine/build --config Release
```

在当前 Windows 工作区，也可以用 `g++` 直接编译：

```bash
g++ -std=c++17 -O2 cpp_engine/src/main.cpp cpp_engine/src/calculator.cpp -o cpp_engine/build/Release/calc_engine.exe
```

后端接口 `/api/calc` 会调用该引擎完成计算。

## 测试与检查

语法检查：

```bash
node --check server.js
node --check public/js/app.js
node --check public/js/charts.js
node --check public/js/can-i-eat-calorie.js
node --check public/sw.js
```

运行测试：

```bash
node --test tests/coach-core.test.js
node --test tests/coach-stream.test.js
node --test tests/fat-loss-sandbox.test.js
node --test tests/food-calorie-estimator.test.js
node --test tests/can-i-eat-calorie.test.js
node tests/calc-engine.test.js
```

## PWA 与 App 打包方向

当前项目已经具备 PWA 基础能力。要上架应用商店，推荐路线是：

1. 将后端部署到公网 HTTPS 服务。
2. 前端 API 地址切换为正式域名。
3. 使用 Capacitor 包装当前 Web App。
4. Android 使用 Android Studio 构建 AAB。
5. iOS 使用 Xcode 构建并上传 App Store Connect。
6. 补齐隐私政策、用户协议、账号注销、数据删除、健康免责声明和权限说明。

## 注意事项

- `.env`、`data/`、`node_modules/`、`.workbuddy/` 不应提交到公开仓库。
- 本地数据库文件不要上传到公开仓库。
- AI 识别和热量估算结果仅供参考，健康建议不应替代医生或营养师意见。
- 食物图片资源应保留来源记录，生产环境需确认版权与授权。
- C++ 引擎的可执行文件可用于本地演示；生产部署建议在目标环境重新构建。
