const test = require('node:test');
const assert = require('node:assert/strict');

const { findLocalFoodCalorieEstimate, sanitizeCalorieEstimate } = require('../lib/food-calorie-estimator');

const catalog = [
  { name: '米饭', calories_per_100g: 116, category: '主食' },
  { name: '鸡胸肉', calories_per_100g: 133, category: '肉蛋类' },
  { name: '番茄炒蛋', calories_per_100g: 94, category: '家常菜' },
];

test('finds exact local calorie estimate', () => {
  const result = findLocalFoodCalorieEstimate('鸡胸肉', catalog);

  assert.equal(result.source, 'local');
  assert.equal(result.food_name, '鸡胸肉');
  assert.equal(result.calories_per_100g, 133);
});

test('finds fuzzy local calorie estimate', () => {
  const result = findLocalFoodCalorieEstimate('一份番茄炒蛋', catalog);

  assert.equal(result.source, 'local');
  assert.equal(result.food_name, '番茄炒蛋');
  assert.equal(result.calories_per_100g, 94);
});

test('returns null when local catalog does not match', () => {
  const result = findLocalFoodCalorieEstimate('神秘料理', catalog);

  assert.equal(result, null);
});

test('sanitizes ai calorie estimate payload', () => {
  const result = sanitizeCalorieEstimate({
    food_name: '奶茶',
    calories_per_100g: 62.7,
    confidence: 0.74,
    note: '按常见全糖奶茶估算',
  }, '珍珠奶茶');

  assert.deepEqual(result, {
    food_name: '奶茶',
    calories_per_100g: 63,
    confidence: 0.74,
    note: '按常见全糖奶茶估算',
    source: 'ai',
  });
});
