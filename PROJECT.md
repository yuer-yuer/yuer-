# 慢慢瘦项目文档

## 项目概览

慢慢瘦是一个本地可运行的减脂健康助手 Web 应用。项目采用单页应用结构，前端负责交互、计算和图表展示，后端负责用户认证、Session 管理和 SQLite 数据持久化。

当前项目已经实现了核心的用户登录注册、个人资料、饮食记录、运动记录、体重记录、饮水记录、历史查询和图表展示能力。

## 技术栈

- 运行环境：Node.js。
- 后端框架：Express。
- 数据库：SQLite，使用 `better-sqlite3` 访问。
- 登录状态：`express-session`。
- 密码哈希：`bcryptjs`。
- 前端：原生 HTML、CSS、JavaScript。
- 样式：Tailwind CSS CDN + 项目自定义 CSS。
- 图表：Chart.js CDN。

## 项目结构

```text
慢慢瘦/
├── package.json
├── package-lock.json
├── server.js
├── start.bat
├── data/
│   ├── database.sqlite
│   ├── database.sqlite-shm
│   └── database.sqlite-wal
└── public/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        ├── app.js
        ├── charts.js
        ├── exercise-db.js
        └── food-db.js
```

## 文件职责

### `server.js`

项目后端入口文件，负责：

- 启动 Express 服务。
- 提供静态资源访问。
- 初始化 SQLite 数据库。
- 创建用户、资料、体重、饮食、自定义食物、运动和饮水相关数据表。
- 处理注册、登录、退出登录和当前用户查询。
- 提供业务数据的增删查接口。
- 对需要登录的接口进行 Session 校验。
- 对用户数据按 `user_id` 过滤，避免跨用户访问。

### `public/index.html`

前端唯一页面入口，承载登录注册界面和主应用界面。主应用通过多个功能区和底部导航完成 SPA 式切换。

### `public/css/style.css`

项目自定义样式文件，用于补充 Tailwind CSS，处理应用级布局、卡片、导航、按钮、弹窗和响应式细节。

### `public/js/app.js`

前端主逻辑文件，负责：

- 登录状态检查。
- 注册、登录、退出。
- Tab 切换。
- 数据拉取和提交。
- 饮食、运动、体重、饮水记录的前端交互。
- 个人资料保存。
- BMI、BMR、TDEE、目标热量、热量汇总等前端计算。
- 页面数据刷新和列表渲染。

### `public/js/charts.js`

图表逻辑文件，负责热量环图和体重趋势图的 Chart.js 初始化与更新。

### `public/js/food-db.js`

内置食物热量库，供饮食搜索和热量计算使用。

### `public/js/exercise-db.js`

内置运动 MET 值表，供运动热量消耗估算使用。

### `data/database.sqlite`

SQLite 数据库文件。应用启动后会在 `data` 目录中读写该文件。

## 安装与启动

安装依赖：

```bash
npm install
```

启动服务：

```bash
node server.js
```

或使用 npm script：

```bash
npm start
```

启动后访问：

```text
http://localhost:3000
```

Windows 下也可以双击或运行：

```bat
start.bat
```

## npm 脚本

`package.json` 当前包含：

```json
{
  "start": "node server.js",
  "dev": "node server.js"
}
```

## 后端接口

### 认证接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/register` | 注册用户 |
| POST | `/api/auth/login` | 登录用户 |
| POST | `/api/auth/logout` | 退出登录 |
| GET | `/api/auth/me` | 获取当前登录用户 |

### 个人资料接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/profile` | 获取个人资料 |
| PUT | `/api/profile` | 更新个人资料 |

### 体重接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/weight?days=30` | 获取最近 N 天体重记录 |
| POST | `/api/weight` | 添加体重记录 |
| DELETE | `/api/weight/:id` | 删除体重记录 |

### 饮食接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/food/today` | 获取今日饮食记录，支持 `date` 查询参数 |
| POST | `/api/food` | 添加饮食记录 |
| DELETE | `/api/food/:id` | 删除饮食记录 |

### 自定义食物接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/custom-foods` | 获取当前用户自定义食物 |
| POST | `/api/custom-foods` | 保存自定义食物 |
| DELETE | `/api/custom-foods/:id` | 删除自定义食物 |

### 运动接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/exercise/today` | 获取今日运动记录，支持 `date` 查询参数 |
| POST | `/api/exercise` | 添加运动记录 |
| DELETE | `/api/exercise/:id` | 删除运动记录 |

### 饮水接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/water/today` | 获取今日饮水记录，支持 `date` 查询参数 |
| POST | `/api/water` | 添加饮水记录 |
| DELETE | `/api/water/:id` | 删除饮水记录 |

### 历史接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/history?date=YYYY-MM-DD` | 获取指定日期的饮食、运动、饮水和体重记录 |

## 数据库表

### `users`

用户基础信息表。

| 字段 | 说明 |
| --- | --- |
| `id` | 用户 ID |
| `username` | 用户名 |
| `password_hash` | bcrypt 密码哈希 |
| `created_at` | 创建时间 |

### `profiles`

用户个人资料表。

| 字段 | 说明 |
| --- | --- |
| `id` | 资料 ID |
| `user_id` | 用户 ID |
| `gender` | 性别 |
| `age` | 年龄 |
| `height` | 身高 |
| `weight` | 当前体重 |
| `target_weight` | 目标体重 |
| `activity_level` | 活动水平 |
| `updated_at` | 更新时间 |

### `weight_records`

体重记录表。

| 字段 | 说明 |
| --- | --- |
| `id` | 记录 ID |
| `user_id` | 用户 ID |
| `weight` | 体重 |
| `record_date` | 记录日期 |
| `created_at` | 创建时间 |

### `food_records`

饮食记录表。

| 字段 | 说明 |
| --- | --- |
| `id` | 记录 ID |
| `user_id` | 用户 ID |
| `food_name` | 食物名称 |
| `calories_per_100g` | 每 100g 热量 |
| `amount_g` | 食用量 |
| `total_calories` | 总热量 |
| `meal_type` | 餐次 |
| `record_date` | 记录日期 |
| `created_at` | 创建时间 |

### `custom_foods`

自定义食物表。

| 字段 | 说明 |
| --- | --- |
| `id` | 食物 ID |
| `user_id` | 用户 ID |
| `food_name` | 食物名称 |
| `calories_per_100g` | 每 100g 热量 |
| `created_at` | 创建时间 |

### `exercise_records`

运动记录表。

| 字段 | 说明 |
| --- | --- |
| `id` | 记录 ID |
| `user_id` | 用户 ID |
| `exercise_name` | 运动名称 |
| `duration_min` | 运动时长 |
| `calories_burned` | 消耗热量 |
| `record_date` | 记录日期 |
| `created_at` | 创建时间 |

### `water_records`

饮水记录表。

| 字段 | 说明 |
| --- | --- |
| `id` | 记录 ID |
| `user_id` | 用户 ID |
| `amount_ml` | 饮水量 |
| `record_date` | 记录日期 |
| `created_at` | 创建时间 |

## 响应格式

成功响应：

```json
{
  "code": 0,
  "message": "成功",
  "data": {}
}
```

错误响应：

```json
{
  "code": 400,
  "message": "中文错误提示"
}
```

未登录访问受保护接口时返回 401。

## 前端计算逻辑

### BMR

```text
男性 BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 + 5
女性 BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 - 161
```

### TDEE

```text
TDEE = BMR × 活动系数
```

### 减脂目标热量

```text
减脂目标热量 = TDEE - 500kcal
```

### 食物总热量

```text
总热量 = 每 100g 热量 × 食用量(g) / 100
```

### 运动消耗

```text
消耗热量 = MET × 体重(kg) × 运动时长(h)
```

## 运行时数据

项目运行时会使用 `data/database.sqlite` 保存用户和业务数据。`database.sqlite-shm` 与 `database.sqlite-wal` 是 SQLite WAL 模式下产生的辅助文件。

如需清空本地数据，可以在停止服务后备份并删除 `data/database.sqlite` 及相关 WAL 文件。删除前应确认不再需要其中的测试数据。

## 开发注意事项

- 保持 `public/index.html` 作为唯一页面入口。
- 新增前端功能优先放在 `public/js/app.js` 或拆分到 `public/js` 下的专用脚本。
- 新增后端业务接口时，需要在 `server.js` 中使用 `requireAuth` 保护用户数据。
- 所有查询和删除操作都应带上 `user_id` 条件。
- 不要把用户密码明文写入数据库。
- 新增数据表时，应继续使用 `CREATE TABLE IF NOT EXISTS`，保证服务启动时可自动初始化。
- 前端展示错误时优先使用后端返回的 `message`。

