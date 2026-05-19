const ENCOURAGEMENTS = [
  '每一滴汗水都是脂肪的眼泪！',
  '你比昨天更强了！',
  '坚持就是胜利，你已经很棒了！',
  '瘦不是目的，健康才是！',
  '今天的努力，明天看得见！',
  '别放弃，你正在变好！',
  '小瘦为你骄傲！',
];

const MEDICAL_KEYWORDS = ['药', '减肥药', '奥利司他', '处方', '病', '胰岛素', '甲状腺', '怀孕', '医生', '手术'];
const NEGATIVE_KEYWORDS = ['罪恶', '崩了', '失败', '吃多', '没运动', '焦虑', '难受', '放弃', '撑', '暴食'];

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sum(rows, key) {
  return (rows || []).reduce((total, row) => total + number(row[key]), 0);
}

function latestWeight(snapshot) {
  const records = snapshot.weightRecords || [];
  return number(records[0]?.weight || snapshot.profile?.weight, 0);
}

function calcBMI(snapshot) {
  const height = number(snapshot.profile?.height);
  const weight = latestWeight(snapshot);
  if (!height || !weight) return 0;
  return Number((weight / ((height / 100) ** 2)).toFixed(1));
}

function calcBMR(snapshot) {
  const p = snapshot.profile || {};
  const weight = latestWeight(snapshot);
  const height = number(p.height);
  const age = number(p.age);
  if (!weight || !height || !age) return 0;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(p.gender === 'male' ? base + 5 : base - 161);
}

function coachMetrics(snapshot = {}) {
  const targetCal = number(snapshot.targets?.caloriesIn, 1500);
  const targetExercise = number(snapshot.targets?.caloriesOut, 300);
  const caloriesIn = Math.round(sum(snapshot.todayFood, 'total_calories'));
  const caloriesOut = Math.round(sum(snapshot.todayExercise, 'calories_burned'));
  const waterMl = Math.round(sum(snapshot.todayWater, 'amount_ml'));
  const currentWeight = latestWeight(snapshot);
  const targetWeight = number(snapshot.profile?.target_weight, 0);
  const remainingCal = Math.max(0, targetCal - caloriesIn);
  const exerciseGap = Math.max(0, targetExercise - caloriesOut);
  return {
    targetCal,
    targetExercise,
    caloriesIn,
    caloriesOut,
    waterMl,
    currentWeight,
    targetWeight,
    remainingCal,
    exerciseGap,
    bmi: calcBMI(snapshot),
    bmr: calcBMR(snapshot),
    streak: number(snapshot.checkin?.streak, 0),
  };
}

function includesAny(text, words) {
  const raw = String(text || '').toLowerCase();
  return words.some(word => raw.includes(String(word).toLowerCase()));
}

function getCoachQuickPrompts(snapshot = {}) {
  const history = snapshot.history || [];
  const now = snapshot.now ? new Date(snapshot.now) : new Date();
  const hour = now.getHours();
  const hasFood = (snapshot.todayFood || []).length > 0;
  const hasExercise = (snapshot.todayExercise || []).length > 0;
  const lastUser = [...history].reverse().find(item => item.role === 'user')?.content || '';

  if (!history.length) return ['帮我制定减脂计划', '今天吃什么好', '推荐一个运动', '计算我的BMI'];
  if (includesAny(lastUser, NEGATIVE_KEYWORDS)) return ['失败安慰', '给我打打气', '看看进步', '明天计划'];
  if (hour >= 6 && hour < 10 && !hasFood) return ['记录早餐', '推荐快手早餐', '看看今天食谱', '今日目标'];
  if (hour >= 10 && hour < 14) return ['记录午餐', '推荐减脂餐', '还剩多少热量', '今日目标'];
  if (hour >= 18 && hour < 22) return ['记录晚餐', '晚上吃什么不胖', '推荐轻食', '今日总结'];
  if (!hasExercise) return ['推荐一个运动', '7分钟快速燃脂', '今天步数多少', '我累了鼓励我'];
  if (hour >= 22) return ['今日总结', '明天吃什么', '设置明天提醒', '晚安小瘦'];
  return ['查今日热量', '看体重趋势', '推荐食谱', '随机鼓励'];
}

function buildLocalCoachReply(message, snapshot = {}) {
  const text = String(message || '');
  const m = coachMetrics(snapshot);
  const foods = snapshot.todayFood || [];
  const exercises = snapshot.todayExercise || [];
  const records = snapshot.weightRecords || [];

  if (includesAny(text, MEDICAL_KEYWORDS)) {
    return {
      content: '这个建议咨询专业医生，小瘦只能给一般性的饮食和运动建议哦。我们可以先从记录饮食、规律运动和睡眠开始，稳一点更安全。'
    };
  }

  if (includesAny(text, NEGATIVE_KEYWORDS)) {
    return {
      content: `别自责！😊 一顿吃多不会决定结果，一直焦虑才容易影响节奏。你已经连续打卡${m.streak}天了，明天正常吃、多喝水、轻松走20分钟就好。有我在，瘦不难~`
    };
  }

  if (/热量|摄入|吃了|今日|剩/.test(text)) {
    const foodText = foods.length
      ? foods.map(item => item.food_name).slice(0, 4).join('、')
      : '还没有饮食记录';
    return {
      content: `今天已摄入${m.caloriesIn}kcal，目标${m.targetCal}kcal，还剩${m.remainingCal}kcal可以安排。已记录：${foodText}。晚点想吃的话，小瘦建议优先选高蛋白+蔬菜。`
    };
  }

  if (/运动|燃脂|消耗|累/.test(text)) {
    const done = exercises.length
      ? exercises.map(item => `${item.exercise_name}${item.duration_min}分钟`).join('、')
      : '还没有运动记录';
    return {
      content: `今天运动消耗${m.caloriesOut}kcal，距离目标还差${m.exerciseGap}kcal。已记录：${done}。现在可以来一组7分钟快速燃脂，或者快走20分钟，轻一点也算数！`
    };
  }

  if (/体重|趋势|进步/.test(text)) {
    if (records.length >= 2) {
      const latest = number(records[0].weight);
      const earliest = number(records[records.length - 1].weight);
      const change = Number((latest - earliest).toFixed(1));
      return {
        content: `最近体重从${earliest}kg到${latest}kg，变化${change > 0 ? '+' : ''}${change}kg。看趋势比看一天更重要，小瘦帮你盯着呢~`
      };
    }
    return { content: `当前体重${m.currentWeight || '--'}kg，目标${m.targetWeight || '--'}kg。多记录几天后，小瘦就能帮你看趋势啦。` };
  }

  if (/bmi|BMI|身体/.test(text)) {
    return {
      content: `你的BMI约${m.bmi || '--'}，BMR约${m.bmr || '--'}kcal/天。BMI只是参考，体重趋势、围度和精神状态也很重要。`
    };
  }

  if (/计划|目标/.test(text)) {
    const gap = m.currentWeight && m.targetWeight ? Number((m.currentWeight - m.targetWeight).toFixed(1)) : 0;
    return {
      content: `小瘦看了一下：当前${m.currentWeight || '--'}kg，目标${m.targetWeight || '--'}kg${gap > 0 ? `，还差${gap}kg` : ''}。建议每日摄入约${m.targetCal}kcal，运动目标${m.targetExercise}kcal，稳定推进更容易坚持。`
    };
  }

  if (/鼓励|打气|随机/.test(text)) {
    return { content: `${ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]} 今天也要加油鸭！` };
  }

  return {
    content: `我在呢，我是小瘦 🤖 你可以问我今日热量、运动建议、体重趋势，或者让我给你打打气。有我在，瘦不难~`
  };
}

function buildCoachSystemPrompt(snapshot = {}) {
  const m = coachMetrics(snapshot);
  const now = snapshot.now ? new Date(snapshot.now) : new Date();
  return `你是"小瘦"，用户的专属减脂AI教练，slogan是"有我在，瘦不难"。
当前时间：${now.toLocaleString('zh-CN', { hour12: false })}
用户今日数据：
- 已摄入：${m.caloriesIn}kcal / 目标${m.targetCal}kcal
- 已运动：${m.caloriesOut}kcal / 目标${m.targetExercise}kcal
- 今日饮水：${m.waterMl}ml
- 当前体重：${m.currentWeight || '--'}kg / 目标${m.targetWeight || '--'}kg
- BMI：${m.bmi || '--'}
- BMR：${m.bmr || '--'}kcal/天
- 连续打卡：${m.streak}天

回复要求：
1. 用中文，像朋友聊天，专业但不说教。
2. 给具体数据支撑建议，每次回复尽量控制在120字以内。
3. 可以用emoji，但每段最多1-2个。
4. 不制造身材焦虑，不说"你胖了"、"你太懒了"、"必须"。
5. 涉及疾病、药物、诊断、处方、极端节食时，说明你不能替代医生，建议咨询专业医生。
6. 不编造不存在的用户记录。`;
}

function sanitizeCoachMessages(messages, limit = 10) {
  return (Array.isArray(messages) ? messages : [])
    .filter(item => item && (item.role === 'user' || item.role === 'assistant') && item.content)
    .slice(-limit)
    .map(item => ({
      role: item.role,
      content: String(item.content).slice(0, 1000),
    }));
}

module.exports = {
  buildCoachSystemPrompt,
  buildLocalCoachReply,
  coachMetrics,
  getCoachQuickPrompts,
  sanitizeCoachMessages,
};
