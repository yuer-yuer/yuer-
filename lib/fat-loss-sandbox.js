const DEFAULT_TARGETS = { caloriesIn: 1500, caloriesOut: 300 };

const RESCUE_EXERCISES = [
  { name: '快走', met: 4.0 },
  { name: '慢跑', met: 7.0 },
  { name: '骑行', met: 6.8 },
];

const ALTERNATIVES = [
  { name: '无糖酸奶', calories_per_100g: 62, note: '保留饱腹感，热量更稳' },
  { name: '水果拼盘', calories_per_100g: 55, note: '适合替代甜饮或甜点' },
  { name: '鸡胸肉沙拉', calories_per_100g: 95, note: '蛋白质更高，适合作为正餐替代' },
  { name: '清蒸鱼', calories_per_100g: 110, note: '比油炸肉类更轻' },
];

function roundNumber(value) {
  return Math.round(Number(value) || 0);
}

function sumCalories(rows, field) {
  return (rows || []).reduce((sum, row) => sum + roundNumber(row[field]), 0);
}

function sanitizeProposedFoods(proposedFoods) {
  if (!Array.isArray(proposedFoods) || proposedFoods.length === 0) {
    throw new Error('至少提供一种食物');
  }

  return proposedFoods.slice(0, 8).map((item) => {
    const name = String(item.name || item.food_name || '').trim();
    const caloriesPer100g = Number(item.calories_per_100g || item.caloriesPer100g || 0);
    const amountG = Number(item.amount_g || item.estimated_amount_g || item.amountG || 0);

    if (!name) throw new Error('食物名称不能为空');
    if (caloriesPer100g <= 0 || amountG <= 0) throw new Error('热量和分量必须大于0');

    const totalCalories = roundNumber(caloriesPer100g * amountG / 100);
    return {
      name: name.slice(0, 40),
      calories_per_100g: roundNumber(caloriesPer100g),
      amount_g: roundNumber(amountG),
      meal_type: item.meal_type || item.mealType || 'snack',
      total_calories: totalCalories,
    };
  });
}

function buildRescuePlan(overBy, weight) {
  if (overBy <= 0) {
    return {
      title: '不需要额外补救',
      summary: '这次选择仍在今天预算内，保持正常节奏即可。',
      exercises: [],
    };
  }

  const safeWeight = Number(weight) > 0 ? Number(weight) : 70;
  return {
    title: `补救 ${overBy} kcal`,
    summary: '如果你想把今天拉回预算，可以选择一种低门槛运动补回来。',
    exercises: RESCUE_EXERCISES.map((exercise) => ({
      name: exercise.name,
      minutes: Math.max(1, Math.ceil((overBy / (exercise.met * safeWeight)) * 60)),
      calories: overBy,
    })),
  };
}

function buildSwapPlan(foods, overBy) {
  const highest = [...foods].sort((a, b) => b.total_calories - a.total_calories)[0];
  const caloriesPerGram = highest.calories_per_100g / 100;
  const reductionCalories = overBy > 0 ? overBy : Math.max(50, Math.round(highest.total_calories * 0.2));
  const reduceGrams = Math.ceil(reductionCalories / caloriesPerGram);
  const suggestedAmountG = Math.max(1, highest.amount_g - reduceGrams);

  return {
    title: overBy > 0 ? '换个吃法更稳' : '想更轻一点可以这样吃',
    reduceAmount: {
      foodName: highest.name,
      originalAmountG: highest.amount_g,
      suggestedAmountG,
      savedCalories: Math.min(highest.total_calories, Math.round((highest.amount_g - suggestedAmountG) * caloriesPerGram)),
    },
    alternatives: ALTERNATIVES
      .filter(item => item.calories_per_100g < highest.calories_per_100g)
      .slice(0, 3),
  };
}

function buildCanIEatAnalysis(input = {}) {
  const proposedFoods = sanitizeProposedFoods(input.proposedFoods);
  const targets = input.targets || DEFAULT_TARGETS;
  const profile = input.profile || {};
  const intake = sumCalories(input.todayFood, 'total_calories');
  const burned = sumCalories(input.todayExercise, 'calories_burned');
  const targetCalories = roundNumber(targets.caloriesIn || DEFAULT_TARGETS.caloriesIn);
  const proposedTotal = sumCalories(proposedFoods, 'total_calories');
  const beforeRemaining = targetCalories - intake + burned;
  const afterRemaining = beforeRemaining - proposedTotal;
  const overBy = Math.max(0, Math.abs(Math.min(0, afterRemaining)));
  const status = overBy > 0 ? 'over' : afterRemaining < 150 ? 'tight' : 'ok';

  return {
    status,
    proposed: {
      foods: proposedFoods,
      totalCalories: proposedTotal,
    },
    budget: {
      targetCalories,
      currentIntake: intake,
      currentBurned: burned,
      beforeRemaining,
      afterRemaining,
      overBy,
    },
    eatPlan: {
      title: status === 'ok' ? '放心吃' : status === 'tight' ? '能吃，但留给后面的空间很少' : '会超出今天预算',
      summary: status === 'over'
        ? `吃完预计超出 ${overBy} kcal，建议减量、替换或安排一点运动。`
        : `吃完今天还剩 ${Math.max(0, afterRemaining)} kcal，可以正常安排。`,
    },
    rescuePlan: buildRescuePlan(overBy, profile.weight),
    swapPlan: buildSwapPlan(proposedFoods, overBy),
  };
}

module.exports = {
  buildCanIEatAnalysis,
};
