// 食物营养查询工具
const logger = require('../monitoring/logger');

class FoodTool {
  constructor() {
    this.name = 'food_query';
    this.description = '查询食物的营养成分（热量、蛋白质、碳水、脂肪等）';

    // 常见食物数据库（每100g）
    this.foodDatabase = {
      // 主食类
      '米饭': { calories: 116, protein: 2.6, carbs: 25.9, fat: 0.3, category: '主食' },
      '馒头': { calories: 223, protein: 7.0, carbs: 47.0, fat: 1.1, category: '主食' },
      '面条': { calories: 137, protein: 4.5, carbs: 28.5, fat: 0.6, category: '主食' },
      '全麦面包': { calories: 246, protein: 9.0, carbs: 46.0, fat: 3.5, category: '主食' },
      '燕麦': { calories: 367, protein: 15.0, carbs: 61.0, fat: 7.0, category: '主食' },
      '红薯': { calories: 86, protein: 1.6, carbs: 20.1, fat: 0.2, category: '主食' },
      '土豆': { calories: 81, protein: 2.0, carbs: 17.8, fat: 0.1, category: '主食' },

      // 蛋白质类
      '鸡胸肉': { calories: 133, protein: 24.6, carbs: 2.5, fat: 5.0, category: '蛋白质' },
      '牛肉': { calories: 125, protein: 20.0, carbs: 0, fat: 5.0, category: '蛋白质' },
      '猪瘦肉': { calories: 143, protein: 20.3, carbs: 1.5, fat: 6.2, category: '蛋白质' },
      '鱼肉': { calories: 104, protein: 18.6, carbs: 0, fat: 3.7, category: '蛋白质' },
      '虾': { calories: 93, protein: 18.6, carbs: 2.8, fat: 1.2, category: '蛋白质' },
      '鸡蛋': { calories: 147, protein: 13.3, carbs: 1.3, fat: 9.5, category: '蛋白质' },
      '牛奶': { calories: 54, protein: 3.0, carbs: 3.4, fat: 3.2, category: '蛋白质' },
      '豆腐': { calories: 81, protein: 8.1, carbs: 4.2, fat: 3.7, category: '蛋白质' },
      '豆浆': { calories: 31, protein: 3.0, carbs: 1.1, fat: 1.8, category: '蛋白质' },

      // 蔬菜类
      '西兰花': { calories: 36, protein: 4.1, carbs: 4.3, fat: 0.6, category: '蔬菜' },
      '菠菜': { calories: 28, protein: 2.6, carbs: 2.9, fat: 0.3, category: '蔬菜' },
      '番茄': { calories: 19, protein: 0.9, carbs: 3.5, fat: 0.2, category: '蔬菜' },
      '黄瓜': { calories: 16, protein: 0.8, carbs: 2.9, fat: 0.2, category: '蔬菜' },
      '生菜': { calories: 13, protein: 1.3, carbs: 1.3, fat: 0.4, category: '蔬菜' },
      '胡萝卜': { calories: 39, protein: 1.0, carbs: 8.8, fat: 0.2, category: '蔬菜' },
      '芹菜': { calories: 14, protein: 0.8, carbs: 2.4, fat: 0.1, category: '蔬菜' },

      // 水果类
      '苹果': { calories: 52, protein: 0.3, carbs: 13.5, fat: 0.2, category: '水果' },
      '香蕉': { calories: 91, protein: 1.4, carbs: 22.8, fat: 0.2, category: '水果' },
      '橙子': { calories: 48, protein: 0.8, carbs: 11.8, fat: 0.2, category: '水果' },
      '葡萄': { calories: 69, protein: 0.5, carbs: 17.3, fat: 0.2, category: '水果' },
      '西瓜': { calories: 26, protein: 0.6, carbs: 5.8, fat: 0.1, category: '水果' },
      '草莓': { calories: 30, protein: 1.0, carbs: 7.1, fat: 0.2, category: '水果' },
      '蓝莓': { calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3, category: '水果' },

      // 坚果类
      '杏仁': { calories: 578, protein: 21.3, carbs: 21.7, fat: 50.6, category: '坚果' },
      '核桃': { calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2, category: '坚果' },
      '花生': { calories: 567, protein: 26.0, carbs: 16.1, fat: 48.7, category: '坚果' },
      '腰果': { calories: 552, protein: 18.2, carbs: 32.7, fat: 43.8, category: '坚果' },

      // 油脂类
      '橄榄油': { calories: 899, protein: 0, carbs: 0, fat: 100.0, category: '油脂' },
      '黄油': { calories: 717, protein: 0.9, carbs: 0.1, fat: 81.1, category: '油脂' },

      // 零食类
      '薯片': { calories: 547, protein: 5.8, carbs: 53.4, fat: 34.6, category: '零食' },
      '巧克力': { calories: 546, protein: 4.9, carbs: 61.2, fat: 30.0, category: '零食' },
      '冰淇淋': { calories: 207, protein: 3.5, carbs: 23.6, fat: 11.0, category: '零食' },
    };
  }

  /**
   * 查询食物营养成分
   */
  async execute(params) {
    const { food_name, amount = 100 } = params;

    try {
      // 查找食物
      const foodData = this._findFood(food_name);

      if (!foodData) {
        return {
          success: false,
          error: `未找到食物"${food_name}"，请尝试其他食物或更准确的名称`,
          suggestion: this._getSuggestions(food_name),
        };
      }

      // 计算指定份量的营养
      const ratio = amount / 100;
      const result = {
        food_name,
        amount,
        unit: 'g',
        category: foodData.category,
        nutrition: {
          calories: Math.round(foodData.calories * ratio),
          protein: Math.round(foodData.protein * ratio * 10) / 10,
          carbs: Math.round(foodData.carbs * ratio * 10) / 10,
          fat: Math.round(foodData.fat * ratio * 10) / 10,
        },
        per_100g: {
          calories: foodData.calories,
          protein: foodData.protein,
          carbs: foodData.carbs,
          fat: foodData.fat,
        },
        evaluation: this._evaluateFood(foodData),
      };

      logger.debug('食物查询成功', { food_name, amount });
      return {
        success: true,
        data: result,
      };

    } catch (error) {
      logger.error('食物查询失败', { error: error.message, params });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 查找食物（支持模糊匹配）
   */
  _findFood(name) {
    // 精确匹配
    if (this.foodDatabase[name]) {
      return this.foodDatabase[name];
    }

    // 模糊匹配
    const matchedKey = Object.keys(this.foodDatabase).find(key =>
      key.includes(name) || name.includes(key)
    );

    return matchedKey ? this.foodDatabase[matchedKey] : null;
  }

  /**
   * 获取建议
   */
  _getSuggestions(name) {
    const categories = {
      '主食': ['米饭', '馒头', '面条', '全麦面包', '燕麦', '红薯', '土豆'],
      '蛋白质': ['鸡胸肉', '牛肉', '鱼肉', '鸡蛋', '豆腐', '牛奶'],
      '蔬菜': ['西兰花', '菠菜', '番茄', '黄瓜', '生菜'],
      '水果': ['苹果', '香蕉', '橙子', '西瓜', '草莓'],
    };

    // 根据关键词推荐
    for (const [category, foods] of Object.entries(categories)) {
      if (name.includes('肉') || name.includes('蛋白')) {
        return `您可以尝试查询：${categories['蛋白质'].join('、')}`;
      }
      if (name.includes('菜') || name.includes('蔬')) {
        return `您可以尝试查询：${categories['蔬菜'].join('、')}`;
      }
      if (name.includes('果') || name.includes('水')) {
        return `您可以尝试查询：${categories['水果'].join('、')}`;
      }
    }

    return `当前数据库包含${Object.keys(this.foodDatabase).length}种常见食物`;
  }

  /**
   * 评估食物
   */
  _evaluateFood(foodData) {
    const { calories, protein, carbs, fat, category } = foodData;
    let evaluation = {
      calorie_level: '',
      protein_level: '',
      suitability: '',
    };

    // 热量评级
    if (calories < 50) {
      evaluation.calorie_level = '极低热量';
    } else if (calories < 150) {
      evaluation.calorie_level = '低热量';
    } else if (calories < 300) {
      evaluation.calorie_level = '中等热量';
    } else {
      evaluation.calorie_level = '高热量';
    }

    // 蛋白质评级
    if (protein > 15) {
      evaluation.protein_level = '高蛋白';
    } else if (protein > 8) {
      evaluation.protein_level = '中等蛋白';
    } else {
      evaluation.protein_level = '低蛋白';
    }

    // 适用性
    if (category === '蔬菜') {
      evaluation.suitability = '非常适合减脂期，可以大量摄入';
    } else if (category === '蛋白质' && protein > 15 && fat < 10) {
      evaluation.suitability = '优质蛋白质来源，适合减脂和增肌';
    } else if (category === '水果' && calories < 60) {
      evaluation.suitability = '低糖水果，适合减脂期适量食用';
    } else if (category === '零食' || calories > 400) {
      evaluation.suitability = '高热量食物，减脂期需严格控制';
    } else {
      evaluation.suitability = '适量食用';
    }

    return evaluation;
  }

  /**
   * 获取所有食物列表
   */
  listAllFoods() {
    const categories = {};

    for (const [name, data] of Object.entries(this.foodDatabase)) {
      if (!categories[data.category]) {
        categories[data.category] = [];
      }
      categories[data.category].push(name);
    }

    return categories;
  }
}

// 单例
const foodTool = new FoodTool();

module.exports = foodTool;
