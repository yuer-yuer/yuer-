const test = require('node:test');
const assert = require('node:assert/strict');

const { buildCanIEatAnalysis } = require('../lib/fat-loss-sandbox');

const baseSnapshot = {
  profile: { weight: 70, gender: 'female' },
  targets: { caloriesIn: 1500, caloriesOut: 300 },
  todayFood: [
    { food_name: '燕麦粥', total_calories: 260 },
    { food_name: '鸡胸肉沙拉', total_calories: 360 },
  ],
  todayExercise: [
    { exercise_name: '快走', calories_burned: 120 },
  ],
};

test('allows a proposed food when it stays within remaining budget', () => {
  const result = buildCanIEatAnalysis({
    ...baseSnapshot,
    proposedFoods: [
      { name: '苹果', calories_per_100g: 52, amount_g: 200, meal_type: 'snack' },
    ],
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.proposed.totalCalories, 104);
  assert.equal(result.budget.beforeRemaining, 1000);
  assert.equal(result.budget.afterRemaining, 896);
  assert.match(result.eatPlan.title, /放心吃/);
});

test('returns rescue exercise minutes when proposed food exceeds budget', () => {
  const result = buildCanIEatAnalysis({
    ...baseSnapshot,
    proposedFoods: [
      { name: '炸鸡套餐', calories_per_100g: 310, amount_g: 420, meal_type: 'dinner' },
    ],
  });

  assert.equal(result.status, 'over');
  assert.equal(result.budget.overBy, 302);
  assert.ok(result.rescuePlan.exercises.find(item => item.name === '快走').minutes > 0);
  assert.ok(result.rescuePlan.exercises.find(item => item.name === '慢跑').minutes > 0);
  assert.match(result.rescuePlan.title, /补救/);
});

test('suggests amount reduction and lower calorie alternatives', () => {
  const result = buildCanIEatAnalysis({
    ...baseSnapshot,
    proposedFoods: [
      { name: '奶茶', calories_per_100g: 65, amount_g: 500, meal_type: 'snack' },
    ],
  });

  assert.equal(result.swapPlan.reduceAmount.foodName, '奶茶');
  assert.ok(result.swapPlan.reduceAmount.suggestedAmountG < 500);
  assert.ok(result.swapPlan.alternatives.length >= 2);
});

test('rejects empty or non-positive proposed foods', () => {
  assert.throws(
    () => buildCanIEatAnalysis({ ...baseSnapshot, proposedFoods: [] }),
    /至少提供一种食物/
  );

  assert.throws(
    () => buildCanIEatAnalysis({
      ...baseSnapshot,
      proposedFoods: [{ name: '炸鸡', calories_per_100g: 0, amount_g: 100 }],
    }),
    /热量和分量必须大于0/
  );
});
