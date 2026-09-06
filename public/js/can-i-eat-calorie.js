(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.resolveCanIEatCalorieSource = api.resolveCanIEatCalorieSource;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function normalizeFoodText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[，。、“”‘’：:；;（）()【】\[\]{}]/g, '');
  }

  function toPositiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function findLocalFood(name, foodDatabase) {
    const query = normalizeFoodText(name);
    if (!query) return null;
    const foods = Array.isArray(foodDatabase) ? foodDatabase : [];
    const exact = foods.find(food => normalizeFoodText(food.name) === query);
    if (exact) return exact;
    return foods
      .filter(food => {
        const candidate = normalizeFoodText(food.name);
        return candidate && (query.includes(candidate) || candidate.includes(query));
      })
      .sort((a, b) => normalizeFoodText(b.name).length - normalizeFoodText(a.name).length)[0] || null;
  }

  function resolveCanIEatCalorieSource(input, foodDatabase) {
    const manualCalories = toPositiveNumber(input && input.manualCalories);
    if (manualCalories) {
      return {
        status: 'manual',
        label: '用户填写',
        caloriesPer100g: manualCalories,
        matchedFood: null,
      };
    }

    const matchedFood = findLocalFood(input && input.name, foodDatabase);
    if (matchedFood) {
      return {
        status: 'local',
        label: '本地食物库',
        caloriesPer100g: toPositiveNumber(matchedFood.cal || matchedFood.calories_per_100g),
        matchedFood,
      };
    }

    return {
      status: 'needs_estimate',
      label: '需要估算',
      caloriesPer100g: 0,
      matchedFood: null,
    };
  }

  return {
    resolveCanIEatCalorieSource,
  };
});
