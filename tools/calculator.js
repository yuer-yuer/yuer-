// 计算引擎工具
const logger = require('../monitoring/logger');

class CalculatorTool {
  constructor() {
    this.name = 'calc_engine';
    this.description = '计算基础代谢率(BMR)、每日总消耗(TDEE)、体脂率、热量缺口等';
  }

  /**
   * 计算基础代谢率 (BMR)
   * 使用Mifflin-St Jeor公式
   */
  calculateBMR(gender, age, height, weight) {
    if (gender === 'male') {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
  }

  /**
   * 计算每日总消耗 (TDEE)
   */
  calculateTDEE(bmr, activityLevel) {
    return bmr * activityLevel;
  }

  /**
   * 估算体脂率（基于BMI）
   * 注意：这是粗略估算，准确测量需要专业仪器
   */
  estimateBodyFat(gender, age, height, weight) {
    const bmi = weight / Math.pow(height / 100, 2);

    if (gender === 'male') {
      return 1.20 * bmi + 0.23 * age - 16.2;
    } else {
      return 1.20 * bmi + 0.23 * age - 5.4;
    }
  }

  /**
   * 计算热量缺口
   */
  calculateDeficit(tdee, goal) {
    const deficitMap = {
      'lose_weight_slow': 250,      // 慢速减脂：每周0.25kg
      'lose_weight_moderate': 500,  // 中速减脂：每周0.5kg
      'lose_weight_fast': 750,      // 快速减脂：每周0.75kg
      'maintain': 0,                // 维持体重
      'gain_muscle': -300,          // 增肌：轻微盈余
    };

    const deficit = deficitMap[goal] || 500;
    return {
      tdee,
      targetCalories: tdee - deficit,
      deficit,
      estimatedWeeklyLoss: deficit * 7 / 7700, // 1kg脂肪≈7700卡
    };
  }

  /**
   * 计算宏量营养素分配
   */
  calculateMacros(targetCalories, goal) {
    let proteinRatio, carbRatio, fatRatio;

    switch (goal) {
      case 'lose_weight_slow':
      case 'lose_weight_moderate':
      case 'lose_weight_fast':
        proteinRatio = 0.30;  // 30%蛋白质
        carbRatio = 0.40;     // 40%碳水
        fatRatio = 0.30;      // 30%脂肪
        break;
      case 'gain_muscle':
        proteinRatio = 0.25;
        carbRatio = 0.50;
        fatRatio = 0.25;
        break;
      default:
        proteinRatio = 0.25;
        carbRatio = 0.45;
        fatRatio = 0.30;
    }

    return {
      protein: {
        grams: Math.round((targetCalories * proteinRatio) / 4),
        calories: Math.round(targetCalories * proteinRatio),
        ratio: proteinRatio,
      },
      carbs: {
        grams: Math.round((targetCalories * carbRatio) / 4),
        calories: Math.round(targetCalories * carbRatio),
        ratio: carbRatio,
      },
      fat: {
        grams: Math.round((targetCalories * fatRatio) / 9),
        calories: Math.round(targetCalories * fatRatio),
        ratio: fatRatio,
      },
    };
  }

  /**
   * 执行工具
   */
  async execute(params) {
    const { calc_type, gender, age, height, weight, activity_level, goal } = params;

    try {
      let result;

      switch (calc_type) {
        case 'bmr':
          const bmr = this.calculateBMR(gender, age, height, weight);
          result = {
            bmr: Math.round(bmr),
            formula: 'Mifflin-St Jeor',
            description: '基础代谢率（BMR）是身体在完全休息状态下维持生命所需的最低热量',
          };
          break;

        case 'tdee':
          const bmrForTdee = this.calculateBMR(gender, age, height, weight);
          const tdee = this.calculateTDEE(bmrForTdee, activity_level);
          result = {
            bmr: Math.round(bmrForTdee),
            tdee: Math.round(tdee),
            activity_level,
            activity_description: this._getActivityDescription(activity_level),
            description: '每日总消耗（TDEE）= 基础代谢率 × 活动系数',
          };
          break;

        case 'body_fat':
          const bodyFat = this.estimateBodyFat(gender, age, height, weight);
          result = {
            body_fat_percentage: Math.round(bodyFat * 10) / 10,
            bmi: Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10,
            note: '这是基于BMI的粗略估算，准确测量需要专业仪器（如DEXA扫描、皮褶测量等）',
          };
          break;

        case 'deficit':
          const bmrForDeficit = this.calculateBMR(gender, age, height, weight);
          const tdeeForDeficit = this.calculateTDEE(bmrForDeficit, activity_level);
          const deficitResult = this.calculateDeficit(tdeeForDeficit, goal);
          const macros = this.calculateMacros(deficitResult.targetCalories, goal);

          result = {
            ...deficitResult,
            macros,
            recommendations: this._getRecommendations(goal),
          };
          break;

        case 'macros':
          const targetCalories = params.target_calories || 2000;
          result = this.calculateMacros(targetCalories, goal || 'maintain');
          break;

        default:
          throw new Error(`未知的计算类型: ${calc_type}`);
      }

      logger.debug('计算引擎执行成功', { calc_type, result });
      return {
        success: true,
        data: result,
      };

    } catch (error) {
      logger.error('计算引擎执行失败', { error: error.message, params });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  _getActivityDescription(level) {
    const descriptions = {
      1.2: '久坐（几乎不运动）',
      1.375: '轻度活动（每周1-3次轻运动）',
      1.5: '中度活动（每周3-5次中等强度运动）',
      1.725: '高度活动（每周6-7次高强度运动）',
      1.9: '极高活动（职业运动员或体力劳动者）',
    };
    return descriptions[level] || '未知活动水平';
  }

  _getRecommendations(goal) {
    const recommendations = {
      'lose_weight_slow': '建议每周减重0.25-0.5kg，稳定且不易反弹',
      'lose_weight_moderate': '建议每周减重0.5-0.75kg，需配合适量运动',
      'lose_weight_fast': '建议每周减重0.75-1kg，需密切监测身体状态，避免过快减重',
      'gain_muscle': '建议配合力量训练，每周增重0.25-0.5kg',
      'maintain': '建议维持当前热量摄入，保持运动习惯',
    };
    return recommendations[goal] || '';
  }
}

// 单例
const calculatorTool = new CalculatorTool();

module.exports = calculatorTool;
