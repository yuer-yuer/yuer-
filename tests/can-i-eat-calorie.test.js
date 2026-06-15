const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveCanIEatCalorieSource } = require('../public/js/can-i-eat-calorie');

const foodDatabase = [
  { name: '米饭', cal: 116, category: '主食' },
  { name: '鸡胸肉', cal: 133, category: '肉蛋类' },
  { name: '番茄炒蛋', cal: 94, category: '家常菜' },
];

test('uses manually entered calories before local matches', () => {
  const result = resolveCanIEatCalorieSource({ name: '米饭', manualCalories: 180 }, foodDatabase);

  assert.equal(result.status, 'manual');
  assert.equal(result.caloriesPer100g, 180);
  assert.equal(result.label, '用户填写');
});

test('matches exact food name from local database', () => {
  const result = resolveCanIEatCalorieSource({ name: '鸡胸肉', manualCalories: 0 }, foodDatabase);

  assert.equal(result.status, 'local');
  assert.equal(result.caloriesPer100g, 133);
  assert.equal(result.matchedFood.name, '鸡胸肉');
});

test('matches food name fuzzily from local database', () => {
  const result = resolveCanIEatCalorieSource({ name: '一份番茄炒蛋', manualCalories: '' }, foodDatabase);

  assert.equal(result.status, 'local');
  assert.equal(result.caloriesPer100g, 94);
  assert.equal(result.matchedFood.name, '番茄炒蛋');
});

test('marks unresolved foods as needing estimation', () => {
  const result = resolveCanIEatCalorieSource({ name: '神秘料理', manualCalories: '' }, foodDatabase);

  assert.equal(result.status, 'needs_estimate');
  assert.equal(result.caloriesPer100g, 0);
  assert.equal(result.matchedFood, null);
});
