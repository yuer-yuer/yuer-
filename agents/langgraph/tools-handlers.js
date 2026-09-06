/**
 * 工具执行器 - Tool Handlers
 */

const logger = require('../../utils/logger');

/**
 * 记录饮食
 */
async function logMealHandler(args, context) {
  const { db, userId } = context;
  const { foods } = args;

  if (!Array.isArray(foods) || foods.length === 0) {
    throw new Error('foods参数必须是非空数组');
  }

  const recordDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const results = [];

  const stmt = db.prepare(`
    INSERT INTO food_records (user_id, food_name, calories_per_100g, amount_g, total_calories, meal_type, record_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const food of foods) {
    const totalCalories = Math.round((food.amount_g / 100) * food.calories_per_100g);

    try {
      const info = stmt.run(
        userId,
        food.food_name,
        food.calories_per_100g,
        food.amount_g,
        totalCalories,
        food.meal_type,
        recordDate
      );

      results.push({
        id: info.lastInsertRowid,
        food_name: food.food_name,
        amount_g: food.amount_g,
        total_calories: totalCalories,
        meal_type: food.meal_type
      });

      logger.info('饮食记录成功', { userId, food: food.food_name, calories: totalCalories });
    } catch (error) {
      logger.error('饮食记录失败', { error: error.message, food: food.food_name });
      throw error;
    }
  }

  return {
    success: true,
    message: `已记录${foods.length}条饮食`,
    data: results,
    total_calories: results.reduce((sum, r) => sum + r.total_calories, 0)
  };
}

/**
 * 记录运动
 */
async function logExerciseHandler(args, context) {
  const { db, userId } = context;
  const { exercise_name, duration_min, calories_burned } = args;

  const recordDate = new Date().toISOString().split('T')[0];

  const stmt = db.prepare(`
    INSERT INTO exercise_records (user_id, exercise_name, duration_min, calories_burned, record_date)
    VALUES (?, ?, ?, ?, ?)
  `);

  try {
    const info = stmt.run(userId, exercise_name, duration_min, calories_burned, recordDate);

    logger.info('运动记录成功', { userId, exercise: exercise_name, calories: calories_burned });

    return {
      success: true,
      message: `已记录运动：${exercise_name}`,
      data: {
        id: info.lastInsertRowid,
        exercise_name,
        duration_min,
        calories_burned,
        record_date: recordDate
      }
    };
  } catch (error) {
    logger.error('运动记录失败', { error: error.message });
    throw error;
  }
}

/**
 * 记录体重
 */
async function logWeightHandler(args, context) {
  const { db, userId } = context;
  const { weight, note } = args;

  const recordDate = new Date().toISOString().split('T')[0];

  // 检查今天是否已有记录
  const existing = db.prepare(`
    SELECT id FROM weight_records WHERE user_id = ? AND record_date = ?
  `).get(userId, recordDate);

  if (existing) {
    // 更新今天的记录
    const stmt = db.prepare(`
      UPDATE weight_records SET weight = ? WHERE id = ?
    `);
    stmt.run(weight, existing.id);

    logger.info('体重记录更新', { userId, weight });

    return {
      success: true,
      message: '已更新今天的体重记录',
      data: { id: existing.id, weight, record_date: recordDate, updated: true }
    };
  } else {
    // 插入新记录
    const stmt = db.prepare(`
      INSERT INTO weight_records (user_id, weight, record_date)
      VALUES (?, ?, ?)
    `);
    const info = stmt.run(userId, weight, recordDate);

    logger.info('体重记录成功', { userId, weight });

    return {
      success: true,
      message: '已记录体重',
      data: { id: info.lastInsertRowid, weight, record_date: recordDate }
    };
  }
}

/**
 * 查询今日汇总
 */
async function queryTodayHandler(args, context) {
  const { db, userId } = context;
  const today = new Date().toISOString().split('T')[0];

  // 查询今日饮食
  const foods = db.prepare(`
    SELECT * FROM food_records WHERE user_id = ? AND record_date = ?
  `).all(userId, today);

  // 查询今日运动
  const exercises = db.prepare(`
    SELECT * FROM exercise_records WHERE user_id = ? AND record_date = ?
  `).all(userId, today);

  // 计算汇总
  const totalCaloriesIn = foods.reduce((sum, f) => sum + f.total_calories, 0);
  const totalCaloriesOut = exercises.reduce((sum, e) => sum + e.calories_burned, 0);
  const netCalories = totalCaloriesIn - totalCaloriesOut;

  logger.info('查询今日汇总', { userId, totalCaloriesIn, totalCaloriesOut });

  return {
    success: true,
    data: {
      date: today,
      foods: foods.map(f => ({
        food_name: f.food_name,
        amount_g: f.amount_g,
        total_calories: f.total_calories,
        meal_type: f.meal_type
      })),
      exercises: exercises.map(e => ({
        exercise_name: e.exercise_name,
        duration_min: e.duration_min,
        calories_burned: e.calories_burned
      })),
      summary: {
        total_calories_in: totalCaloriesIn,
        total_calories_out: totalCaloriesOut,
        net_calories: netCalories,
        food_count: foods.length,
        exercise_count: exercises.length
      }
    }
  };
}

/**
 * 查询历史记录
 */
async function queryHistoryHandler(args, context) {
  const { db, userId } = context;
  const { record_type, days = 7 } = args;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  let records = [];
  let tableName = '';

  switch (record_type) {
    case 'food':
      tableName = 'food_records';
      records = db.prepare(`
        SELECT * FROM food_records
        WHERE user_id = ? AND record_date >= ?
        ORDER BY record_date DESC, created_at DESC
      `).all(userId, startDateStr);
      break;

    case 'exercise':
      tableName = 'exercise_records';
      records = db.prepare(`
        SELECT * FROM exercise_records
        WHERE user_id = ? AND record_date >= ?
        ORDER BY record_date DESC, created_at DESC
      `).all(userId, startDateStr);
      break;

    case 'weight':
      tableName = 'weight_records';
      records = db.prepare(`
        SELECT * FROM weight_records
        WHERE user_id = ? AND record_date >= ?
        ORDER BY record_date DESC
      `).all(userId, startDateStr);
      break;

    default:
      throw new Error(`不支持的记录类型: ${record_type}`);
  }

  logger.info('查询历史记录', { userId, record_type, days, count: records.length });

  return {
    success: true,
    data: {
      record_type,
      days,
      start_date: startDateStr,
      count: records.length,
      records
    }
  };
}

/**
 * 搜索食物数据库
 */
async function searchFoodDatabaseHandler(args, context) {
  const { db, userId } = context;
  const { food_name } = args;

  // 先查用户自定义食物库
  const customFood = db.prepare(`
    SELECT * FROM custom_foods WHERE user_id = ? AND food_name LIKE ?
  `).get(userId, `%${food_name}%`);

  if (customFood) {
    logger.info('找到自定义食物', { userId, food_name });
    return {
      success: true,
      source: 'custom',
      data: {
        food_name: customFood.food_name,
        calories_per_100g: customFood.calories_per_100g
      }
    };
  }

  // TODO: 这里可以集成第三方食物API
  // 目前返回未找到
  logger.info('食物数据库中未找到', { userId, food_name });

  return {
    success: false,
    message: `未找到食物: ${food_name}`,
    suggestion: '建议用户手动输入热量，系统会自动保存到自定义食物库'
  };
}

/**
 * 工具执行器映射
 */
const TOOL_HANDLERS = {
  log_meal: logMealHandler,
  log_exercise: logExerciseHandler,
  log_weight: logWeightHandler,
  query_today: queryTodayHandler,
  query_history: queryHistoryHandler,
  search_food_database: searchFoodDatabaseHandler
};

/**
 * 执行工具
 */
async function executeTool(toolName, args, context) {
  const handler = TOOL_HANDLERS[toolName];

  if (!handler) {
    throw new Error(`未知工具: ${toolName}`);
  }

  try {
    return await handler(args, context);
  } catch (error) {
    logger.error('工具执行失败', { tool: toolName, error: error.message });
    throw error;
  }
}

module.exports = {
  TOOL_HANDLERS,
  executeTool
};
