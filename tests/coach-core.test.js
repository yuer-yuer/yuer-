const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildCoachSystemPrompt,
  buildLocalCoachReply,
  getCoachQuickPrompts,
  sanitizeCoachMessages,
} = require('../lib/coach-core');

const snapshot = {
  now: new Date('2026-05-18T08:30:00+08:00'),
  profile: {
    gender: 'female',
    age: 28,
    height: 168,
    weight: 70,
    target_weight: 65,
    target_date: '2026-07-01',
  },
  todayFood: [
    { food_name: '燕麦粥', meal_type: 'breakfast', total_calories: 260 },
    { food_name: '鸡胸肉沙拉', meal_type: 'lunch', total_calories: 360 },
  ],
  todayExercise: [
    { exercise_name: '快走', duration_min: 20, calories_burned: 120 },
  ],
  todayWater: [
    { amount_ml: 500 },
    { amount_ml: 350 },
  ],
  weightRecords: [
    { weight: 70, record_date: '2026-05-18' },
    { weight: 71.2, record_date: '2026-05-12' },
  ],
  checkin: { streak: 12, checkinDates: ['2026-05-17', '2026-05-18'] },
  targets: { caloriesIn: 1500, caloriesOut: 300 },
};

test('quick prompts use first-use scene when conversation is empty', () => {
  const prompts = getCoachQuickPrompts({ ...snapshot, history: [] });
  assert.deepEqual(prompts, ['帮我制定减脂计划', '今天吃什么好', '推荐一个运动', '计算我的BMI']);
});

test('local reply answers today calorie query with real numbers', () => {
  const reply = buildLocalCoachReply('查今日热量', snapshot);
  assert.match(reply.content, /620kcal/);
  assert.match(reply.content, /还剩880kcal/);
  assert.match(reply.content, /燕麦粥/);
});

test('local reply comforts negative emotion without blame', () => {
  const reply = buildLocalCoachReply('我今天吃多了好罪恶', snapshot);
  assert.match(reply.content, /别自责|没关系/);
  assert.doesNotMatch(reply.content, /太懒|胖了|必须/);
});

test('local reply redirects medical requests to doctors', () => {
  const reply = buildLocalCoachReply('我能吃减肥药吗', snapshot);
  assert.match(reply.content, /医生|专业/);
});

test('system prompt injects user data and role boundary', () => {
  const prompt = buildCoachSystemPrompt(snapshot);
  assert.match(prompt, /你是"小瘦"/);
  assert.match(prompt, /已摄入：620kcal \/ 目标1500kcal/);
  assert.match(prompt, /连续打卡：12天/);
  assert.match(prompt, /不能替代医生/);
});

test('sanitizeCoachMessages keeps last valid conversation turns only', () => {
  const messages = Array.from({ length: 12 }, (_, idx) => ({
    role: idx % 2 ? 'assistant' : 'user',
    content: `message-${idx}`,
    timestamp: Date.now() + idx,
    ignored: true,
  }));
  messages.push({ role: 'system', content: 'bad' });
  const clean = sanitizeCoachMessages(messages, 6);
  assert.equal(clean.length, 6);
  assert.equal(clean[0].content, 'message-6');
  assert.deepEqual(Object.keys(clean[0]).sort(), ['content', 'role']);
  assert.ok(clean.every(item => item.role === 'user' || item.role === 'assistant'));
});
