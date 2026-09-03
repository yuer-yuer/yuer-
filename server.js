const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const Database = require('better-sqlite3');
const {
  buildCoachSystemPrompt,
  buildLocalCoachReply,
  getCoachQuickPrompts,
  sanitizeCoachMessages,
} = require('./lib/coach-core');
const { buildCanIEatAnalysis } = require('./lib/fat-loss-sandbox');
const {
  findLocalFoodCalorieEstimate,
  sanitizeCalorieEstimate,
} = require('./lib/food-calorie-estimator');
const {
  chunkText,
  extractZhipuStreamDelta,
} = require('./lib/coach-stream');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();

const app = express();
const PORT = 3000;

// ─── 确保数据目录存在 ────────────────────────────────
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ─── 中间件 ─────────────────────────────────────────
app.use(express.json({ limit: '8mb' }));
app.use((req, res, next) => {
  if (req.path === '/sw.js') res.setHeader('Service-Worker-Allowed', '/');
  if (req.path === '/manifest.webmanifest') res.type('application/manifest+json');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// 简易 Session 存储（内存 + cookie）
const sessions = {};
app.use(session({
  secret: 'fat-loss-helper-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// ─── 数据库初始化 ────────────────────────────────────
const db = new Database(path.join(dataDir, 'database.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('✅ 数据库已连接');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    gender TEXT DEFAULT 'male',
    age INTEGER DEFAULT 25,
    height REAL DEFAULT 170,
    weight REAL DEFAULT 70,
    target_weight REAL DEFAULT 60,
    activity_level TEXT DEFAULT 'sedentary',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS weight_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    weight REAL NOT NULL,
    record_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS food_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    food_name TEXT NOT NULL,
    calories_per_100g REAL NOT NULL,
    amount_g REAL NOT NULL,
    total_calories REAL NOT NULL,
    meal_type TEXT NOT NULL,
    record_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS custom_foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    food_name TEXT NOT NULL,
    calories_per_100g REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS exercise_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    exercise_name TEXT NOT NULL,
    duration_min REAL NOT NULL,
    calories_burned REAL NOT NULL,
    record_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS water_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount_ml INTEGER NOT NULL,
    record_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weight_records(user_id, record_date);
  CREATE INDEX IF NOT EXISTS idx_food_user_date ON food_records(user_id, record_date);
  CREATE INDEX IF NOT EXISTS idx_exercise_user_date ON exercise_records(user_id, record_date);
  CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_records(user_id, record_date);
  CREATE INDEX IF NOT EXISTS idx_custom_foods_user ON custom_foods(user_id);
`);

const profileColumns = [
  { name: 'initial_weight', type: 'REAL', defaultValue: 'NULL' },
  { name: 'avatar_url', type: 'TEXT', defaultValue: 'NULL' },
  { name: 'target_date', type: 'TEXT', defaultValue: 'NULL' },
  { name: 'reminder_weigh', type: 'TEXT', defaultValue: "'08:00'" },
  { name: 'reminder_weigh_enabled', type: 'INTEGER', defaultValue: '0' },
  { name: 'reminder_water_interval', type: 'INTEGER', defaultValue: '120' },
  { name: 'reminder_water_enabled', type: 'INTEGER', defaultValue: '0' },
  { name: 'reminder_exercise', type: 'TEXT', defaultValue: "'18:00'" },
  { name: 'reminder_exercise_enabled', type: 'INTEGER', defaultValue: '0' },
  { name: 'onboarded', type: 'INTEGER', defaultValue: '0' },
];

profileColumns.forEach(col => {
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.defaultValue}`);
  } catch (e) {
    // Column already exists.
  }
});

// ─── 预编译语句（性能优化）────────────────────────────

// ─── 工具函数 ────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ code: 401, message: '请先登录' });
  }
  next();
}

function ok(data = null, message = '成功') {
  return { code: 0, message, data };
}

function err(code, message) {
  return { code, message };
}

const AI_CONFIG = {
  zhipu: {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: process.env.ZHIPU_MODEL || 'glm-4v-flash',
    chatModel: process.env.ZHIPU_CHAT_MODEL || 'glm-4-flash',
    apiKey: process.env.ZHIPU_API_KEY,
  },
  aliyun: {
    url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    model: process.env.DASHSCOPE_MODEL || 'qwen-vl-plus',
    apiKey: process.env.DASHSCOPE_API_KEY,
  },
};

const RECOGNIZE_PROMPT = `
你是一个严谨的营养识别助手。请识别图片中的餐食，并估算每种食物的分量、热量和三大营养素。
要求：
1. 只返回 JSON，不要 Markdown，不要解释。
2. 如果不确定，请保守估计，并降低 confidence。
3. total_calories = calories_per_100g * estimated_amount_g / 100。
4. 字段必须完整，数值使用数字。
5. 返回格式：
{
  "foods": [
    {
      "name": "米饭",
      "estimated_amount_g": 200,
      "calories_per_100g": 116,
      "total_calories": 232,
      "protein_g": 5,
      "fat_g": 1,
      "carbs_g": 52,
      "confidence": 0.8
    }
  ],
  "summary": "图片中包含米饭、蔬菜和肉类",
  "need_user_confirm": true
}
`;

function loadFoodCatalogForAi() {
  try {
    const text = fs.readFileSync(path.join(__dirname, 'public', 'js', 'food-db.js'), 'utf8');
    const re = /\{\s*name:\s*'([^']+)'\s*,\s*cal:\s*(\d+(?:\.\d+)?)\s*,\s*category:\s*'([^']+)'\s*\}/g;
    const rows = [];
    let match;
    while ((match = re.exec(text))) {
      rows.push({ name: match[1], calories_per_100g: Number(match[2]), category: match[3] });
    }
    return rows;
  } catch (e) {
    return [];
  }
}

const AI_FOOD_CATALOG = loadFoodCatalogForAi();

function loadExerciseCatalogForApi() {
  try {
    const text = fs.readFileSync(path.join(__dirname, 'public', 'js', 'exercise-db.js'), 'utf8');
    const re = /\{\s*name:\s*'([^']+)'\s*,\s*met:\s*(\d+(?:\.\d+)?)\s*,\s*icon:\s*'([^']+)'\s*,\s*category:\s*'([^']+)'\s*\}/g;
    const rows = [];
    let match;
    while ((match = re.exec(text))) {
      rows.push({
        name: match[1],
        met: Number(match[2]),
        icon: match[3],
        category: match[4],
      });
    }
    return rows;
  } catch (e) {
    return [];
  }
}

const EXERCISE_CATALOG = loadExerciseCatalogForApi();

function getMockAiFoodResult() {
  return sanitizeAiFoods({
    foods: [
      {
        name: '米饭',
        estimated_amount_g: 200,
        calories_per_100g: 116,
        protein_g: 5,
        fat_g: 1,
        carbs_g: 52,
        confidence: 0.9,
      },
      {
        name: '清炒时蔬',
        estimated_amount_g: 150,
        calories_per_100g: 45,
        protein_g: 3,
        fat_g: 4,
        carbs_g: 8,
        confidence: 0.75,
      },
      {
        name: '红烧鸡块',
        estimated_amount_g: 120,
        calories_per_100g: 165,
        protein_g: 20,
        fat_g: 9,
        carbs_g: 3,
        confidence: 0.72,
      },
    ],
    summary: '调试模式：模拟识别出一份包含主食、蔬菜和肉类的餐食',
  });
}

function normalizeFoodName(name) {
  return String(name || '').replace(/[()\s（）、,，]/g, '').toLowerCase();
}

function findBestFoodMatch(name) {
  const input = normalizeFoodName(name);
  if (!input) return null;
  let best = null;
  let bestScore = 0;
  for (const food of AI_FOOD_CATALOG) {
    const candidate = normalizeFoodName(food.name);
    let score = 0;
    if (candidate === input) score = 100;
    else if (candidate.includes(input) || input.includes(candidate)) score = 80;
    else {
      const chars = [...new Set(input.split(''))];
      const hit = chars.filter(ch => candidate.includes(ch)).length;
      score = chars.length ? Math.round((hit / chars.length) * 60) : 0;
    }
    if (score > bestScore) {
      bestScore = score;
      best = food;
    }
  }
  return bestScore >= 45 ? { ...best, match_score: bestScore } : null;
}

function extractJsonObject(text) {
  const raw = String(text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(raw);
  } catch (e) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw e;
  }
}

function sanitizeAiFoods(payload) {
  const foods = Array.isArray(payload?.foods) ? payload.foods : [];
  return foods.slice(0, 8).map(item => {
    const amount = Math.max(1, Math.round(Number(item.estimated_amount_g || item.amount_g || 100)));
    const match = findBestFoodMatch(item.name);
    const caloriesPer100g = Math.max(1, Math.round(Number(match?.calories_per_100g || item.calories_per_100g || 100)));
    const totalCalories = Math.round(caloriesPer100g * amount / 100);
    return {
      name: String(match?.name || item.name || '未知食物').slice(0, 30),
      original_name: String(item.name || '').slice(0, 30),
      estimated_amount_g: amount,
      calories_per_100g: caloriesPer100g,
      total_calories: totalCalories,
      protein_g: Number(Number(item.protein_g || 0).toFixed(1)),
      fat_g: Number(Number(item.fat_g || 0).toFixed(1)),
      carbs_g: Number(Number(item.carbs_g || 0).toFixed(1)),
      confidence: Math.max(0, Math.min(1, Number(item.confidence || 0.6))),
      matched: !!match,
      match_score: match?.match_score || 0,
      category: match?.category || '',
    };
  }).filter(item => item.name && item.total_calories > 0);
}

async function callZhipuVision(config, image) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: RECOGNIZE_PROMPT },
          { type: 'image_url', image_url: { url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` } },
        ],
      }],
      temperature: 0.1,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || data.message || 'AI识别失败');
  return data.choices?.[0]?.message?.content;
}

async function callAliyunVision(config, image) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      input: {
        messages: [{
          role: 'user',
          content: [
            { text: RECOGNIZE_PROMPT },
            { image: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` },
          ],
        }],
      },
      parameters: { temperature: 0.1 },
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'AI识别失败');
  return data.output?.choices?.[0]?.message?.content?.map?.(x => x.text).filter(Boolean).join('\n')
    || data.output?.text
    || data.output?.choices?.[0]?.message?.content;
}

async function callZhipuFoodCalorieEstimate(config, foodName) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.chatModel || 'glm-4-flash',
      messages: [{
        role: 'user',
        content: `请估算“${foodName}”常见做法每100克的热量。只返回JSON，不要Markdown。格式：{"food_name":"食物名","calories_per_100g":数字,"confidence":0到1,"note":"一句估算依据"}`,
      }],
      temperature: 0.1,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || data.message || 'AI估算失败');
  return data.choices?.[0]?.message?.content;
}

function calcServerTargets(profile) {
  if (!profile) return { caloriesIn: 1500, caloriesOut: 300 };
  const weight = Number(profile.weight) || 70;
  const height = Number(profile.height) || 170;
  const age = Number(profile.age) || 25;
  const bmr = profile.gender === 'female'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    heavy: 1.725,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = Math.round(bmr * (multipliers[profile.activity_level] || 1.2));
  return {
    caloriesIn: Math.max(1200, Math.round(tdee - 500)),
    caloriesOut: 300,
  };
}

function activityLevelToEngineValue(level) {
  const map = {
    sedentary: 1,
    light: 2,
    moderate: 3,
    heavy: 4,
    active: 4,
    very_active: 5,
  };
  if (typeof level === 'number') return level;
  return map[level] || 1;
}

function getEnginePath() {
  if (process.platform === 'win32') {
    const releasePath = path.join(__dirname, 'cpp_engine', 'build', 'Release', 'calc_engine.exe');
    if (fs.existsSync(releasePath)) return releasePath;
    return path.join(__dirname, 'cpp_engine', 'build', 'calc_engine.exe');
  }
  return path.join(__dirname, 'cpp_engine', 'build', 'calc_engine');
}

function callCalcEngine(inputData) {
  return new Promise((resolve, reject) => {
    const proc = execFile(getEnginePath(), [], { timeout: 5000 }, (error, stdout) => {
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
    proc.stdin.write(JSON.stringify(inputData));
    proc.stdin.end();
  });
}

function getCoachCheckin(uid) {
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const startDate = since.toISOString().split('T')[0];
  const rows = db.prepare(`
    SELECT DISTINCT record_date FROM (
      SELECT record_date FROM food_records WHERE user_id = ? AND record_date >= ?
      UNION
      SELECT record_date FROM exercise_records WHERE user_id = ? AND record_date >= ?
      UNION
      SELECT record_date FROM water_records WHERE user_id = ? AND record_date >= ?
    )
    ORDER BY record_date
  `).all(uid, startDate, uid, startDate, uid, startDate);
  const checkinDates = rows.map(row => row.record_date);
  let streak = 0;
  let cursor = today();
  while (checkinDates.includes(cursor)) {
    streak += 1;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = d.toISOString().split('T')[0];
  }
  return { streak, checkinDates };
}

function buildCoachSnapshotForUser(uid) {
  const date = today();
  let profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(uid);
  if (!profile) {
    db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(uid);
    profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(uid);
  }
  return {
    now: new Date(),
    profile,
    todayFood: db.prepare('SELECT * FROM food_records WHERE user_id = ? AND record_date = ? ORDER BY meal_type, created_at').all(uid, date),
    todayExercise: db.prepare('SELECT * FROM exercise_records WHERE user_id = ? AND record_date = ? ORDER BY created_at').all(uid, date),
    todayWater: db.prepare('SELECT * FROM water_records WHERE user_id = ? AND record_date = ? ORDER BY created_at').all(uid, date),
    weightRecords: db.prepare('SELECT * FROM weight_records WHERE user_id = ? ORDER BY record_date DESC, created_at DESC LIMIT 14').all(uid),
    checkin: getCoachCheckin(uid),
    targets: calcServerTargets(profile),
  };
}

async function callZhipuCoach(config, snapshot, messages) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.chatModel || 'glm-4-flash',
      messages: [
        { role: 'system', content: buildCoachSystemPrompt(snapshot) },
        ...messages,
      ],
      temperature: 0.65,
      max_tokens: 500,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || data.message || '小瘦暂时连不上AI');
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('小瘦没有生成回复');
  return String(content).trim().slice(0, 1200);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function startCoachTextStream(res) {
  res.status(200);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
}

async function streamLocalCoachReply(res, text) {
  for (const chunk of chunkText(text, 8)) {
    res.write(chunk);
    await delay(28);
  }
}

async function callZhipuCoachStream(config, snapshot, messages, onDelta) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.chatModel || 'glm-4-flash',
      messages: [
        { role: 'system', content: buildCoachSystemPrompt(snapshot) },
        ...messages,
      ],
      temperature: 0.65,
      max_tokens: 500,
      stream: true,
    }),
  });

  if (!response.ok) {
    let message = '灏忕槮鏆傛椂杩炰笉涓夾I';
    try {
      const data = await response.json();
      message = data.error?.message || data.message || message;
    } catch {
      // Keep the generic message when the provider returns non-JSON.
    }
    throw new Error(message);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let received = false;
  for await (const bytes of response.body) {
    buffer += decoder.decode(bytes, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() || '';
    for (const part of parts) {
      for (const delta of extractZhipuStreamDelta(part)) {
        received = true;
        onDelta(delta);
      }
    }
  }

  buffer += decoder.decode();
  for (const delta of extractZhipuStreamDelta(buffer)) {
    received = true;
    onDelta(delta);
  }
  if (!received) throw new Error('灏忕槮娌℃湁鐢熸垚鍥炲');
}

function buildLocalCanIEatCopy(analysis) {
  const lines = [analysis.eatPlan.summary];
  if (analysis.budget.overBy > 0) {
    const walk = analysis.rescuePlan.exercises.find(item => item.name === '快走') || analysis.rescuePlan.exercises[0];
    if (walk) lines.push(`如果照吃，饭后${walk.name}${walk.minutes}分钟左右可以把缺口补回来。`);
  }
  if (analysis.swapPlan?.reduceAmount) {
    const reduce = analysis.swapPlan.reduceAmount;
    lines.push(`${reduce.foodName}可以从${reduce.originalAmountG}g减到${reduce.suggestedAmountG}g，大约少${reduce.savedCalories}kcal。`);
  }
  return lines.join('\n');
}

async function callZhipuCanIEatCopy(config, snapshot, analysis) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.chatModel || 'glm-4-flash',
      messages: [
        {
          role: 'system',
          content: [
            '你是减脂私教“小瘦”。请根据结构化结果写一段简短、克制、可执行的中文建议。',
            '不要编造新的热量数字，不要给医疗建议，不要保证减重结果。',
            '输出 2-4 句，语气像专业教练，允许温和但不要夸张。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: JSON.stringify({
            user: {
              weight: snapshot.profile?.weight,
              target_weight: snapshot.profile?.target_weight,
              todayFoodCount: snapshot.todayFood?.length || 0,
            },
            analysis,
          }),
        },
      ],
      temperature: 0.55,
      max_tokens: 260,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || data.message || '小瘦暂时无法生成建议');
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('小瘦没有生成建议');
  return String(content).trim().slice(0, 600);
}

// ─── 认证 API ────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const { username, password, avatar_url } = req.body;
  if (!username || !password) return res.status(400).json(err(400, '用户名和密码不能为空'));
  if (password.length < 6) return res.status(400).json(err(400, '密码长度至少6位'));
  if (username.length < 2 || username.length > 20) return res.status(400).json(err(400, '用户名长度2-20个字符'));
  if (avatar_url && String(avatar_url).length > 900000) return res.status(400).json(err(400, '头像图片过大，请换一张小图'));

  try {
    const hash = await bcrypt.hash(password, 10);
    const insertUser = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const insertProfile = db.prepare('INSERT INTO profiles (user_id, avatar_url) VALUES (?, ?)');

    const transaction = db.transaction(() => {
      const info = insertUser.run(username, hash);
      insertProfile.run(info.lastInsertRowid, avatar_url || null);
      return info.lastInsertRowid;
    });

    const userId = transaction();
    req.session.userId = userId;
    req.session.username = username;
    res.json(ok({ id: userId, username }, '注册成功'));
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      return res.status(400).json(err(400, '用户名已存在'));
    }
    res.status(500).json(err(500, '注册失败'));
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json(err(400, '用户名和密码不能为空'));

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(400).json(err(400, '用户名或密码错误'));

  try {
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json(err(400, '用户名或密码错误'));

    req.session.userId = user.id;
    req.session.username = user.username;
    res.json(ok({ id: user.id, username: user.username }, '登录成功'));
  } catch (e) {
    res.status(500).json(err(500, '服务器错误'));
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json(ok(null, '已退出'));
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json(err(401, '未登录'));
  res.json(ok({ id: req.session.userId, username: req.session.username }));
});

app.post('/api/calc', requireAuth, async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.action === 'tdee') {
      payload.activity_level = activityLevelToEngineValue(payload.activity_level);
    }
    const result = await callCalcEngine(payload);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── 个人信息 API ────────────────────────────────────

app.get('/api/profile', requireAuth, (req, res) => {
  let row = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.session.userId);
  if (!row) {
    db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(req.session.userId);
    row = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.session.userId);
  }
  res.json(ok(row));
});

app.put('/api/profile', requireAuth, (req, res) => {
  const {
    gender, age, height, weight, initial_weight, target_weight, target_date, activity_level, avatar_url,
    reminder_weigh, reminder_weigh_enabled,
    reminder_water_interval, reminder_water_enabled,
    reminder_exercise, reminder_exercise_enabled,
    onboarded
  } = req.body;
  if (avatar_url && String(avatar_url).length > 900000) return res.status(400).json(err(400, '头像图片过大，请换一张小图'));
  try {
    let previous = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.session.userId);
    if (!previous) {
      db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(req.session.userId);
      previous = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.session.userId);
    }
    const nextOnboarded = onboarded === undefined ? (previous?.onboarded || 0) : (onboarded ? 1 : 0);
    db.prepare(
      `UPDATE profiles SET gender=?, age=?, height=?, weight=?, initial_weight=?, target_weight=?, activity_level=?, target_date=?, avatar_url=?,
        reminder_weigh=?, reminder_weigh_enabled=?,
        reminder_water_interval=?, reminder_water_enabled=?,
        reminder_exercise=?, reminder_exercise_enabled=?,
        onboarded=?,
        updated_at=CURRENT_TIMESTAMP WHERE user_id=?`
    ).run(
      gender, age, height, weight, initial_weight || weight || null, target_weight, activity_level, target_date || null, avatar_url || null,
      reminder_weigh || '08:00', reminder_weigh_enabled ? 1 : 0,
      reminder_water_interval || 120, reminder_water_enabled ? 1 : 0,
      reminder_exercise || '18:00', reminder_exercise_enabled ? 1 : 0,
      nextOnboarded,
      req.session.userId
    );
    if ((previous?.onboarded || 0) === 0 && nextOnboarded === 1 && Number(weight) > 0) {
      const recordDate = today();
      const existing = db.prepare(
        'SELECT id FROM weight_records WHERE user_id = ? AND record_date = ? ORDER BY created_at DESC LIMIT 1'
      ).get(req.session.userId, recordDate);
      if (!existing) {
        db.prepare('INSERT INTO weight_records (user_id, weight, record_date) VALUES (?, ?, ?)')
          .run(req.session.userId, Number(weight), recordDate);
      }
    }
    const updated = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.session.userId);
    res.json(ok({ profile: updated, targets: calcServerTargets(updated) }, '个人信息已更新'));
  } catch (e) {
    res.status(500).json(err(500, '更新失败'));
  }
});

// ─── 体重记录 API ────────────────────────────────────

app.post('/api/calc-plan', requireAuth, (req, res) => {
  const currentWeight = Number(req.body.current_weight);
  const targetWeight = Number(req.body.target_weight);
  const targetDate = req.body.target_date;

  if (!currentWeight || !targetWeight || !targetDate) {
    return res.status(400).json(err(400, '请提供完整目标信息'));
  }

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.session.userId);
  if (!profile) return res.status(400).json(err(400, '请先完善个人资料'));

  const bmr = profile.gender === 'female'
    ? 10 * currentWeight + 6.25 * profile.height - 5 * profile.age - 161
    : 10 * currentWeight + 6.25 * profile.height - 5 * profile.age + 5;
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    heavy: 1.725,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = Math.round(bmr * (multipliers[profile.activity_level] || 1.2));
  const daysDiff = Math.max(1, Math.ceil((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24)));
  const weightToLose = Math.max(0, currentWeight - targetWeight);
  const totalDeficit = weightToLose * 7700;
  const dailyDeficit = Math.max(0, Math.round(totalDeficit / daysDiff));
  const dietShare = dailyDeficit <= 700 ? 0.75 : dailyDeficit <= 1200 ? 0.65 : 0.55;
  const minIntake = profile.gender === 'female' ? 1000 : 1200;
  const dailyIntake = Math.max(minIntake, Math.round(tdee - dailyDeficit * dietShare));
  const dietDeficit = Math.max(0, tdee - dailyIntake);
  const exerciseBurn = Math.max(0, Math.round(dailyDeficit - dietDeficit));
  const isAggressive = dailyDeficit > 800;
  const isExtreme = dailyDeficit > 1500 || exerciseBurn > 900;

  res.json(ok({
    tdee,
    dailyDeficit,
    dailyIntakeTarget: dailyIntake,
    exerciseBurnTarget: exerciseBurn,
    daysToTarget: daysDiff,
    weightToLose: Number(weightToLose.toFixed(1)),
    isRealistic: !isAggressive,
    warning: isExtreme
      ? '目标非常激进，数据仅用于测算，建议谨慎执行并关注身体状态'
      : isAggressive ? '目标较激进，建议延长周期' : null,
  }));
});

app.get('/api/weight', requireAuth, (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffDate = cutoff.toISOString().split('T')[0];
  const rows = db.prepare(
    'SELECT * FROM weight_records WHERE user_id = ? AND record_date >= ? ORDER BY record_date DESC, created_at DESC'
  ).all(req.session.userId, cutoffDate);
  res.json(ok(rows));
});

app.post('/api/weight', requireAuth, (req, res) => {
  const { weight, record_date } = req.body;
  if (!weight || weight <= 0) return res.status(400).json(err(400, '请输入有效体重'));
  const date = record_date || today();

  try {
    const info = db.prepare(
      'INSERT INTO weight_records (user_id, weight, record_date) VALUES (?, ?, ?)'
    ).run(req.session.userId, weight, date);
    res.json(ok({ id: Number(info.lastInsertRowid), weight, record_date: date }, '体重已记录'));
  } catch (e) {
    res.status(500).json(err(500, '记录失败'));
  }
});

app.delete('/api/weight/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM weight_records WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  if (info.changes === 0) return res.status(404).json(err(404, '记录不存在'));
  res.json(ok(null, '已删除'));
});

// ─── 饮食记录 API ────────────────────────────────────

app.post('/api/ai/recognize-food', requireAuth, async (req, res) => {
  const { image, provider } = req.body;
  if (!image) return res.status(400).json(err(400, '请提供图片'));
  if (String(image).length > 7 * 1024 * 1024) return res.status(400).json(err(400, '图片过大，请重新选择或压缩后上传'));

  if (process.env.AI_MOCK === '1') {
    const foods = getMockAiFoodResult();
    return res.json(ok({
      foods,
      summary: '调试模式：模拟识别出一份包含主食、蔬菜和肉类的餐食',
      total_calories: foods.reduce((sum, item) => sum + item.total_calories, 0),
      need_user_confirm: true,
      provider: 'mock',
    }));
  }

  const requestedProvider = provider || process.env.AI_PROVIDER || 'zhipu';
  const providerName = AI_CONFIG[requestedProvider] ? requestedProvider : 'zhipu';
  const config = AI_CONFIG[providerName];
  if (!config.apiKey) {
    return res.status(500).json(err(500, `未配置AI密钥，请设置 ${providerName === 'aliyun' ? 'DASHSCOPE_API_KEY' : 'ZHIPU_API_KEY'}`));
  }

  try {
    const content = providerName === 'aliyun'
      ? await callAliyunVision(config, image)
      : await callZhipuVision(config, image);
    const parsed = extractJsonObject(content);
    const foods = sanitizeAiFoods(parsed);
    if (!foods.length) return res.status(422).json(err(422, '没有识别到可记录的食物，请换一张更清晰的照片'));

    res.json(ok({
      foods,
      summary: String(parsed.summary || 'AI已完成餐食估算').slice(0, 120),
      total_calories: foods.reduce((sum, item) => sum + item.total_calories, 0),
      need_user_confirm: true,
      provider: providerName,
    }));
  } catch (e) {
    console.error('AI food recognition failed:', e);
    res.status(500).json(err(500, e.message || 'AI识别失败，请稍后重试'));
  }
});

app.post('/api/ai/estimate-food-calorie', requireAuth, async (req, res) => {
  const foodName = String(req.body?.food_name || req.body?.name || '').trim();
  if (!foodName) return res.status(400).json(err(400, '请先输入食物名称'));

  const local = findLocalFoodCalorieEstimate(foodName, AI_FOOD_CATALOG);
  if (local) return res.json(ok(local));

  if (process.env.AI_MOCK === '1') {
    return res.json(ok({
      food_name: foodName,
      calories_per_100g: 100,
      confidence: 0.5,
      note: '调试模式默认估算',
      source: 'mock',
    }));
  }

  if (!AI_CONFIG.zhipu.apiKey) {
    return res.status(500).json(err(500, '本地库未找到，且未配置AI密钥，无法自动估算'));
  }

  try {
    const content = await callZhipuFoodCalorieEstimate(AI_CONFIG.zhipu, foodName);
    const parsed = extractJsonObject(content);
    res.json(ok(sanitizeCalorieEstimate(parsed, foodName)));
  } catch (e) {
    console.error('Food calorie estimate failed:', e);
    res.status(500).json(err(500, e.message || 'AI估算热量失败，请手动填写'));
  }
});

app.post('/api/ai/can-i-eat', requireAuth, async (req, res) => {
  const snapshot = buildCoachSnapshotForUser(req.session.userId);
  let analysis;
  try {
    analysis = buildCanIEatAnalysis({
      ...snapshot,
      proposedFoods: req.body?.foods || req.body?.proposedFoods,
    });
  } catch (e) {
    return res.status(400).json(err(400, e.message || '食物信息不完整'));
  }

  const localCopy = buildLocalCanIEatCopy(analysis);
  if (process.env.AI_MOCK === '1' || !AI_CONFIG.zhipu.apiKey) {
    return res.json(ok({
      analysis,
      coachCopy: localCopy,
      provider: process.env.AI_MOCK === '1' ? 'mock' : 'local',
    }));
  }

  try {
    const coachCopy = await callZhipuCanIEatCopy(AI_CONFIG.zhipu, snapshot, analysis);
    res.json(ok({
      analysis,
      coachCopy,
      provider: 'zhipu',
      model: AI_CONFIG.zhipu.chatModel,
    }));
  } catch (e) {
    console.error('Can I eat copy failed:', e);
    res.json(ok({
      analysis,
      coachCopy: `${localCopy}\n\n（小瘦刚才网络开小差了，先按本地计算结果给你判断。）`,
      provider: 'local-fallback',
    }));
  }
});

app.post('/api/ai/coach-chat', requireAuth, async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json(err(400, '请输入要和小瘦说的话'));
  if (message.length > 800) return res.status(400).json(err(400, '消息太长了，精简一点再发给小瘦吧'));

  const snapshot = buildCoachSnapshotForUser(req.session.userId);
  const history = sanitizeCoachMessages(req.body?.history, 10);
  const outbound = history.at(-1)?.role === 'user' && history.at(-1)?.content === message
    ? history
    : [...history, { role: 'user', content: message }];
  const local = buildLocalCoachReply(message, snapshot).content;

  if (req.query.stream === '1') {
    startCoachTextStream(res);
    if (process.env.AI_MOCK === '1' || !AI_CONFIG.zhipu.apiKey) {
      await streamLocalCoachReply(res, local);
      return res.end();
    }

    let wroteProviderChunk = false;
    try {
      await callZhipuCoachStream(AI_CONFIG.zhipu, snapshot, outbound, chunk => {
        wroteProviderChunk = true;
        res.write(chunk);
      });
    } catch (e) {
      console.error('AI coach stream failed:', e);
      if (!wroteProviderChunk) {
        await streamLocalCoachReply(res, `${local}\n\n锛堝皬鐦﹀垰鎵嶇綉缁滃紑灏忓樊浜嗭紝鍏堟寜浣犵殑鏈湴鏁版嵁缁欏缓璁€傦級`);
      }
    }
    return res.end();
  }

  if (process.env.AI_MOCK === '1' || !AI_CONFIG.zhipu.apiKey) {
    return res.json(ok({
      reply: local,
      provider: process.env.AI_MOCK === '1' ? 'mock' : 'local',
      quickPrompts: getCoachQuickPrompts({ ...snapshot, history: outbound }),
    }));
  }

  try {
    const reply = await callZhipuCoach(AI_CONFIG.zhipu, snapshot, outbound);
    res.json(ok({
      reply,
      provider: 'zhipu',
      model: AI_CONFIG.zhipu.chatModel,
      quickPrompts: getCoachQuickPrompts({
        ...snapshot,
        history: [...outbound, { role: 'assistant', content: reply }],
      }),
    }));
  } catch (e) {
    console.error('AI coach chat failed:', e);
    res.json(ok({
      reply: `${local}\n\n（小瘦刚才网络开小差了，先按你的本地数据给建议。）`,
      provider: 'local-fallback',
      quickPrompts: getCoachQuickPrompts({ ...snapshot, history: outbound }),
    }));
  }
});

app.get('/api/food/today', requireAuth, (req, res) => {
  const date = req.query.date || today();
  const rows = db.prepare(
    'SELECT * FROM food_records WHERE user_id = ? AND record_date = ? ORDER BY meal_type, created_at'
  ).all(req.session.userId, date);
  res.json(ok(rows));
});

app.post('/api/food', requireAuth, (req, res) => {
  const { food_name, calories_per_100g, amount_g, total_calories, meal_type, record_date } = req.body;
  if (!food_name || !total_calories || !meal_type) return res.status(400).json(err(400, '请填写完整信息'));
  const date = record_date || today();

  try {
    const info = db.prepare(
      'INSERT INTO food_records (user_id, food_name, calories_per_100g, amount_g, total_calories, meal_type, record_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.session.userId, food_name, calories_per_100g, amount_g, total_calories, meal_type, date);
    res.json(ok({ id: Number(info.lastInsertRowid) }, '饮食已记录'));
  } catch (e) {
    res.status(500).json(err(500, '记录失败'));
  }
});

app.delete('/api/food/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM food_records WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  if (info.changes === 0) return res.status(404).json(err(404, '记录不存在'));
  res.json(ok(null, '已删除'));
});

app.get('/api/frequent-foods', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT
      food_name,
      calories_per_100g,
      COUNT(*) as frequency,
      MAX(created_at) as last_used,
      meal_type,
      AVG(amount_g) as avg_amount
    FROM food_records
    WHERE user_id = ? AND record_date >= date('now', '-7 days')
    GROUP BY food_name, calories_per_100g
    ORDER BY frequency DESC, last_used DESC
    LIMIT 8
  `).all(req.session.userId);
  res.json(ok(rows));
});

app.get('/api/frequent-exercises', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT
      exercise_name,
      COUNT(*) as frequency,
      AVG(duration_min) as avg_duration,
      MAX(created_at) as last_used
    FROM exercise_records
    WHERE user_id = ? AND record_date >= date('now', '-7 days')
    GROUP BY exercise_name
    ORDER BY frequency DESC, last_used DESC
    LIMIT 6
  `).all(req.session.userId);

  const enriched = rows.map(row => {
    const meta = EXERCISE_CATALOG.find(item => item.name === row.exercise_name) || {};
    return {
      exercise_name: row.exercise_name,
      frequency: row.frequency,
      avg_duration: Math.round(Number(row.avg_duration || 0)),
      last_used: row.last_used,
      met: meta.met || null,
      icon: meta.icon || '🏃',
      category: meta.category || '自定义',
    };
  });

  res.json(ok(enriched));
});

// ─── 自定义食物 API ──────────────────────────────────

app.get('/api/custom-foods', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM custom_foods WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  res.json(ok(rows));
});

app.post('/api/custom-foods', requireAuth, (req, res) => {
  const { food_name, calories_per_100g } = req.body;
  if (!food_name || !calories_per_100g) return res.status(400).json(err(400, '请填写食物名称和热量'));

  try {
    const info = db.prepare('INSERT INTO custom_foods (user_id, food_name, calories_per_100g) VALUES (?, ?, ?)').run(req.session.userId, food_name, calories_per_100g);
    res.json(ok({ id: Number(info.lastInsertRowid), food_name, calories_per_100g }, '自定义食物已保存'));
  } catch (e) {
    res.status(500).json(err(500, '添加失败'));
  }
});

app.delete('/api/custom-foods/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM custom_foods WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  if (info.changes === 0) return res.status(404).json(err(404, '食物不存在'));
  res.json(ok(null, '已删除'));
});

// ─── 运动记录 API ────────────────────────────────────

app.get('/api/exercise/today', requireAuth, (req, res) => {
  const date = req.query.date || today();
  const rows = db.prepare('SELECT * FROM exercise_records WHERE user_id = ? AND record_date = ? ORDER BY created_at').all(req.session.userId, date);
  res.json(ok(rows));
});

app.post('/api/exercise', requireAuth, (req, res) => {
  const { exercise_name, duration_min, calories_burned, record_date } = req.body;
  if (!exercise_name || !duration_min || !calories_burned) return res.status(400).json(err(400, '请填写完整信息'));
  const date = record_date || today();

  try {
    const info = db.prepare('INSERT INTO exercise_records (user_id, exercise_name, duration_min, calories_burned, record_date) VALUES (?, ?, ?, ?, ?)').run(req.session.userId, exercise_name, duration_min, calories_burned, date);
    res.json(ok({ id: Number(info.lastInsertRowid) }, '运动已记录'));
  } catch (e) {
    res.status(500).json(err(500, '记录失败'));
  }
});

app.delete('/api/exercise/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM exercise_records WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  if (info.changes === 0) return res.status(404).json(err(404, '记录不存在'));
  res.json(ok(null, '已删除'));
});

// ─── 饮水记录 API ────────────────────────────────────

app.get('/api/water/today', requireAuth, (req, res) => {
  const date = req.query.date || today();
  const rows = db.prepare('SELECT * FROM water_records WHERE user_id = ? AND record_date = ? ORDER BY created_at').all(req.session.userId, date);
  res.json(ok(rows));
});

app.post('/api/water', requireAuth, (req, res) => {
  const { amount_ml, record_date } = req.body;
  if (!amount_ml || amount_ml <= 0) return res.status(400).json(err(400, '请输入有效饮水量'));
  const date = record_date || today();

  try {
    const info = db.prepare('INSERT INTO water_records (user_id, amount_ml, record_date) VALUES (?, ?, ?)').run(req.session.userId, amount_ml, date);
    res.json(ok({ id: Number(info.lastInsertRowid), amount_ml, record_date: date }, '饮水已记录'));
  } catch (e) {
    res.status(500).json(err(500, '记录失败'));
  }
});

app.delete('/api/water/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM water_records WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  if (info.changes === 0) return res.status(404).json(err(404, '记录不存在'));
  res.json(ok(null, '已删除'));
});

app.get('/api/checkin-calendar', requireAuth, (req, res) => {
  const { month } = req.query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json(err(400, '请指定月份'));
  }

  const startDate = `${month}-01`;
  const [year, m] = month.split('-').map(Number);
  const nextMonth = m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, '0')}`;

  const rows = db.prepare(`
    SELECT DISTINCT record_date FROM (
      SELECT record_date FROM food_records WHERE user_id = ? AND record_date >= ? AND record_date < ?
      UNION
      SELECT record_date FROM exercise_records WHERE user_id = ? AND record_date >= ? AND record_date < ?
      UNION
      SELECT record_date FROM water_records WHERE user_id = ? AND record_date >= ? AND record_date < ?
    )
    ORDER BY record_date
  `).all(
    req.session.userId, startDate, nextMonth,
    req.session.userId, startDate, nextMonth,
    req.session.userId, startDate, nextMonth
  );

  const checkinDates = rows.map(r => r.record_date);
  const todayStr = today();
  let streak = 0;
  let checkDate = todayStr;
  while (checkinDates.includes(checkDate)) {
    streak++;
    const d = new Date(checkDate);
    d.setDate(d.getDate() - 1);
    checkDate = d.toISOString().split('T')[0];
  }

  res.json(ok({ checkinDates, streak, today: todayStr }));
});

app.get('/api/stats', requireAuth, (req, res) => {
  const { period } = req.query;
  const uid = req.session.userId;
  const todayStr = today();

  let startDate;
  if (period === 'month') {
    startDate = `${todayStr.slice(0, 7)}-01`;
  } else {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    startDate = d.toISOString().split('T')[0];
  }

  const weightRows = db.prepare(
    'SELECT weight, record_date FROM weight_records WHERE user_id = ? AND record_date >= ? AND record_date <= ? ORDER BY record_date'
  ).all(uid, startDate, todayStr);
  const startWeight = weightRows.length > 0 ? weightRows[0].weight : null;
  const endWeight = weightRows.length > 0 ? weightRows[weightRows.length - 1].weight : null;

  const foodRows = db.prepare(
    'SELECT record_date, SUM(total_calories) as daily_cal FROM food_records WHERE user_id = ? AND record_date >= ? AND record_date <= ? GROUP BY record_date ORDER BY record_date'
  ).all(uid, startDate, todayStr);
  const exerciseRows = db.prepare(
    'SELECT record_date, SUM(calories_burned) as daily_cal, SUM(duration_min) as daily_min, COUNT(*) as count FROM exercise_records WHERE user_id = ? AND record_date >= ? AND record_date <= ? GROUP BY record_date ORDER BY record_date'
  ).all(uid, startDate, todayStr);
  const exerciseTypeRows = db.prepare(
    'SELECT exercise_name, SUM(calories_burned) as total_cal, SUM(duration_min) as total_min, COUNT(*) as count FROM exercise_records WHERE user_id = ? AND record_date >= ? AND record_date <= ? GROUP BY exercise_name ORDER BY total_cal DESC'
  ).all(uid, startDate, todayStr).map(row => {
    const meta = EXERCISE_CATALOG.find(item => item.name === row.exercise_name) || {};
    return {
      ...row,
      category: meta.category || '自定义',
      icon: meta.icon || '🏃',
      met: meta.met || null,
    };
  });
  const waterRows = db.prepare(
    'SELECT record_date, SUM(amount_ml) as daily_ml FROM water_records WHERE user_id = ? AND record_date >= ? AND record_date <= ? GROUP BY record_date ORDER BY record_date'
  ).all(uid, startDate, todayStr);

  const avgIntake = foodRows.length ? Math.round(foodRows.reduce((s, r) => s + (r.daily_cal || 0), 0) / foodRows.length) : 0;
  const avgBurned = exerciseRows.length ? Math.round(exerciseRows.reduce((s, r) => s + (r.daily_cal || 0), 0) / exerciseRows.length) : 0;
  const avgWater = waterRows.length ? Math.round(waterRows.reduce((s, r) => s + (r.daily_ml || 0), 0) / waterRows.length) : 0;
  const totalExerciseMin = exerciseRows.reduce((s, r) => s + (r.daily_min || 0), 0);
  const totalExerciseCount = exerciseRows.reduce((s, r) => s + (r.count || 0), 0);

  const checkinRows = db.prepare(`
    SELECT DISTINCT record_date FROM (
      SELECT record_date FROM food_records WHERE user_id = ? AND record_date >= ? AND record_date <= ?
      UNION
      SELECT record_date FROM exercise_records WHERE user_id = ? AND record_date >= ? AND record_date <= ?
      UNION
      SELECT record_date FROM water_records WHERE user_id = ? AND record_date >= ? AND record_date <= ?
    )
  `).all(uid, startDate, todayStr, uid, startDate, todayStr, uid, startDate, todayStr);

  const daysDiff = Math.max(Math.round((new Date(todayStr) - new Date(startDate)) / 86400000) + 1, 1);
  const checkinDays = checkinRows.length;

  res.json(ok({
    period,
    startDate,
    endDate: todayStr,
    daysDiff,
    checkinDays,
    weight: {
      start: startWeight,
      end: endWeight,
      change: startWeight !== null && endWeight !== null ? +(endWeight - startWeight).toFixed(1) : null
    },
    avgIntake,
    avgBurned,
    avgWater,
    totalExerciseMin,
    totalExerciseCount,
    dailyFood: foodRows,
    dailyExercise: exerciseRows,
    exerciseByType: exerciseTypeRows,
    dailyWeight: weightRows,
  }));
});

// ─── 历史记录 API ────────────────────────────────────

app.get('/api/history', requireAuth, (req, res) => {
  const date = req.query.date || today();
  const uid = req.session.userId;

  const food = db.prepare('SELECT * FROM food_records WHERE user_id = ? AND record_date = ? ORDER BY meal_type').all(uid, date);
  const exercise = db.prepare('SELECT * FROM exercise_records WHERE user_id = ? AND record_date = ? ORDER BY created_at').all(uid, date);
  const water = db.prepare('SELECT * FROM water_records WHERE user_id = ? AND record_date = ? ORDER BY created_at').all(uid, date);
  const weight = db.prepare('SELECT * FROM weight_records WHERE user_id = ? AND record_date = ?').all(uid, date);

  res.json(ok({ date, food, exercise, water, weight }));
});

// ─── Agent API ─────────────────────────────────────────
const { agentGraph } = require('./agents');
const metricsCollector = require('./monitoring/metrics');

// Agent对话接口
app.post('/api/agent/chat', async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: '消息不能为空' });
    }

    // 调用Agent Graph
    const result = await agentGraph.invoke({
      message,
      userId: userId || req.session.userId || 'anonymous',
    });

    res.json(result);
  } catch (error) {
    console.error('Agent处理失败:', error);
    res.status(500).json({
      error: '处理失败',
      reply: '抱歉，系统繁忙，请稍后再试😊',
    });
  }
});

// 指标查询接口
app.get('/api/agent/metrics', (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('获取指标失败:', error);
    res.status(500).json({ error: '获取指标失败' });
  }
});

// ─── SPA 回退 ──────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── 启动 ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 减脂健康助手已启动: http://localhost:${PORT}`);
});
