# 慢慢瘦

慢慢瘦是一款移动端优先的减脂健康助手 PWA，采用新粗野主义 App 风格界面，围绕饮食记录、运动消耗、体重目标、饮水打卡和 AI 私教“小瘦”提供日常减脂管理体验。

项目当前形态是 Node.js + Express + SQLite 后端，前端为原生 HTML/CSS/JavaScript 单页应用，可作为 PWA 安装到手机桌面，后续可通过 Capacitor 打包为 Android / iOS App。

## 核心功能

- 饮食记录：三餐记录、常用食物、自定义食物、食物适配度评分。
- AI 拍照识别：上传或拍摄餐食图片，后端调用视觉模型识别食物、分量、热量和营养信息。
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

## 环境变量

`.env` 不应提交到 Git。请在本地或服务器环境中配置：

```env
SESSION_SECRET=replace_with_a_strong_secret
ZHIPU_API_KEY=replace_with_your_zhipu_api_key
ZHIPU_VISION_MODEL=glm-4v-flash
ZHIPU_CHAT_MODEL=glm-4-flash
```

AI Key 必须只放在服务端，不能写入前端代码、PWA 缓存或打包后的 App 客户端。

## 项目结构

```text
.
+-- server.js                  # Express API 与 SQLite 初始化
+-- lib/                       # 可复用业务逻辑
+-- public/                    # 前端静态资源
|   +-- index.html
|   +-- css/
|   +-- js/
|   +-- images/
|   +-- manifest.webmanifest
|   +-- sw.js
+-- scripts/                   # 开发脚本
+-- tests/                     # Node 测试
+-- data/                      # 本地 SQLite 数据库，已忽略
+-- docs/                      # 实施计划和项目文档
```

## 测试与检查

语法检查：

```bash
node --check server.js
node --check public/js/app.js
node --check public/js/charts.js
node --check public/sw.js
```

运行测试：

```bash
node --test tests/coach-core.test.js
```

## PWA 与 App 打包方向

当前项目已经具备 PWA 基础能力。要上架应用商店，推荐路线是：

1. 将后端部署到公网 HTTPS 服务器。
2. 前端 API 地址切换为正式域名。
3. 使用 Capacitor 包装当前 Web App。
4. Android 使用 Android Studio 构建 AAB。
5. iOS 使用 Xcode 构建并上传 App Store Connect。
6. 补齐隐私政策、用户协议、账号注销、数据删除、健康免责声明和权限说明。

## 注意事项

- `.env`、`data/`、`node_modules/`、`.workbuddy/` 已加入 `.gitignore`。
- 本地数据库文件不要上传到公开仓库。
- 食物图片资源应保留来源记录，生产环境需确认版权与授权。
- AI 识别结果仅供参考，健康建议不应替代医生或营养师意见。
