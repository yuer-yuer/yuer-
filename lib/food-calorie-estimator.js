function normalizeFoodName(name) {
  return String(name || '').replace(/[()\s（）、,，。]/g, '').toLowerCase();
}

function findLocalFoodCalorieEstimate(foodName, catalog) {
  const input = normalizeFoodName(foodName);
  if (!input) return null;

  let best = null;
  let bestScore = 0;
  for (const food of Array.isArray(catalog) ? catalog : []) {
    const candidate = normalizeFoodName(food.name || food.food_name);
    let score = 0;
    if (candidate === input) score = 100;
    else if (candidate && (candidate.includes(input) || input.includes(candidate))) score = 80;
    if (score > bestScore) {
      best = food;
      bestScore = score;
    }
  }

  if (!best || bestScore < 80) return null;
  return {
    food_name: best.name || best.food_name,
    calories_per_100g: Math.round(Number(best.calories_per_100g || best.cal || 0)),
    confidence: bestScore / 100,
    note: '来自本地食物库',
    source: 'local',
  };
}

function sanitizeCalorieEstimate(payload, fallbackName) {
  const calories = Math.round(Number(payload?.calories_per_100g || 0));
  if (!Number.isFinite(calories) || calories <= 0) {
    throw new Error('AI没有返回有效热量');
  }
  return {
    food_name: String(payload?.food_name || fallbackName || '未知食物').slice(0, 30),
    calories_per_100g: calories,
    confidence: Math.max(0, Math.min(1, Number(payload?.confidence || 0.6))),
    note: String(payload?.note || 'AI按常见做法估算').slice(0, 80),
    source: 'ai',
  };
}

module.exports = {
  findLocalFoodCalorieEstimate,
  sanitizeCalorieEstimate,
};
