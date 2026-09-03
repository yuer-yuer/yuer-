// API路由 - 会话和用户管理
const express = require('express');
const router = express.Router();
const { sessionManager, userProfileManager } = require('../session');
const logger = require('../monitoring/logger');

// 统一响应格式
function apiResponse(success, data = null, message = '', error = null) {
  return {
    success,
    data,
    message,
    error,
    timestamp: new Date().toISOString(),
  };
}

// ===== 会话管理 API =====

/**
 * POST /api/session/create
 * 创建新会话
 */
router.post('/session/create', (req, res) => {
  try {
    const { userId } = req.body;
    const session = sessionManager.createSession(userId || 'anonymous');

    res.json(apiResponse(true, {
      sessionId: session.sessionId,
      userId: session.userId,
      createdAt: new Date(session.createdAt).toISOString(),
    }, '会话创建成功'));
  } catch (error) {
    logger.error('创建会话失败', { error: error.message });
    res.status(500).json(apiResponse(false, null, '创建会话失败', error.message));
  }
});

/**
 * GET /api/session/:sessionId
 * 获取会话信息
 */
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const stats = sessionManager.getSessionStats(sessionId);

    if (!stats) {
      return res.status(404).json(apiResponse(false, null, '会话不存在或已过期'));
    }

    res.json(apiResponse(true, stats));
  } catch (error) {
    logger.error('获取会话失败', { error: error.message });
    res.status(500).json(apiResponse(false, null, '获取会话失败', error.message));
  }
});

/**
 * DELETE /api/session/:sessionId
 * 清除会话
 */
router.delete('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const cleared = sessionManager.clearSession(sessionId);

    if (!cleared) {
      return res.status(404).json(apiResponse(false, null, '会话不存在'));
    }

    res.json(apiResponse(true, null, '会话已清除'));
  } catch (error) {
    logger.error('清除会话失败', { error: error.message });
    res.status(500).json(apiResponse(false, null, '清除会话失败', error.message));
  }
});

/**
 * GET /api/session/list
 * 获取活跃会话列表
 */
router.get('/session/list', (req, res) => {
  try {
    const sessions = sessionManager.getActiveSessions();
    const systemStats = sessionManager.getSystemStats();

    res.json(apiResponse(true, {
      sessions,
      stats: systemStats,
    }));
  } catch (error) {
    logger.error('获取会话列表失败', { error: error.message });
    res.status(500).json(apiResponse(false, null, '获取会话列表失败', error.message));
  }
});

// ===== 用户配置 API =====

/**
 * POST /api/user/profile
 * 创建或更新用户配置
 */
router.post('/user/profile', (req, res) => {
  try {
    const { userId, basicInfo, preferences, goals } = req.body;

    if (!userId) {
      return res.status(400).json(apiResponse(false, null, 'userId不能为空'));
    }

    const profile = userProfileManager.setProfile(userId, {
      basicInfo,
      preferences,
      goals,
    });

    res.json(apiResponse(true, profile, '用户配置已保存'));
  } catch (error) {
    logger.error('保存用户配置失败', { error: error.message });
    res.status(500).json(apiResponse(false, null, '保存用户配置失败', error.message));
  }
});

/**
 * GET /api/user/:userId/profile
 * 获取用户配置
 */
router.get('/user/:userId/profile', (req, res) => {
  try {
    const { userId } = req.params;
    const profile = userProfileManager.getProfile(userId);

    if (!profile) {
      return res.status(404).json(apiResponse(false, null, '用户配置不存在'));
    }

    res.json(apiResponse(true, profile));
  } catch (error) {
    logger.error('获取用户配置失败', { error: error.message });
    res.status(500).json(apiResponse(false, null, '获取用户配置失败', error.message));
  }
});

/**
 * POST /api/user/:userId/weight
 * 记录体重
 */
router.post('/user/:userId/weight', (req, res) => {
  try {
    const { userId } = req.params;
    const { weight, date } = req.body;

    if (!weight || weight <= 0) {
      return res.status(400).json(apiResponse(false, null, '体重必须大于0'));
    }

    const record = userProfileManager.recordWeight(userId, weight, date);

    res.json(apiResponse(true, record, '体重记录成功'));
  } catch (error) {
    logger.error('记录体重失败', { error: error.message });
    res.status(500).json(apiResponse(false, null, error.message));
  }
});

/**
 * POST /api/user/:userId/exercise
 * 记录运动
 */
router.post('/user/:userId/exercise', (req, res) => {
  try {
    const { userId } = req.params;
    const exerciseData = req.body;

    if (!exerciseData.type || !exerciseData.duration) {
      return res.status(400).json(apiResponse(false, null, '运动类型和时长不能为空'));
    }

    const record = userProfileManager.recordExercise(userId, exerciseData);

    res.json(apiResponse(true, record, '运动记录成功'));
  } catch (error) {
    logger.error('记录运动失败', { error: error.message });
    res.status(500).json(apiResponse(false, null, error.message));
  }
});

/**
 * GET /api/user/:userId/stats
 * 获取用户进度统计
 */
router.get('/user/:userId/stats', (req, res) => {
  try {
    const { userId } = req.params;
    const stats = userProfileManager.getProgressStats(userId);

    if (!stats) {
      return res.status(404).json(apiResponse(false, null, '用户不存在'));
    }

    res.json(apiResponse(true, stats));
  } catch (error) {
    logger.error('获取统计失败', { error: error.message });
    res.status(500).json(apiResponse(false, null, '获取统计失败', error.message));
  }
});

/**
 * DELETE /api/user/:userId/profile
 * 删除用户配置
 */
router.delete('/user/:userId/profile', (req, res) => {
  try {
    const { userId } = req.params;
    const deleted = userProfileManager.deleteProfile(userId);

    if (!deleted) {
      return res.status(404).json(apiResponse(false, null, '用户不存在'));
    }

    res.json(apiResponse(true, null, '用户配置已删除'));
  } catch (error) {
    logger.error('删除用户配置失败', { error: error.message });
    res.status(500).json(apiResponse(false, null, '删除用户配置失败', error.message));
  }
});

// ===== 工具 API =====

const { calculatorTool, foodTool } = require('../tools');

/**
 * POST /api/tools/calculate
 * 计算工具（BMR/TDEE/体脂率/热量缺口）
 */
router.post('/tools/calculate', async (req, res) => {
  try {
    const result = await calculatorTool.execute(req.body);
    res.json(apiResponse(result.success, result.data, '', result.error));
  } catch (error) {
    logger.error('计算失败', { error: error.message });
    res.status(500).json(apiResponse(false, null, '计算失败', error.message));
  }
});

/**
 * POST /api/tools/food/query
 * 查询食物营养成分
 */
router.post('/tools/food/query', async (req, res) => {
  try {
    const result = await foodTool.execute(req.body);
    res.json(apiResponse(result.success, result.data, '', result.error));
  } catch (error) {
    logger.error('查询食物失败', { error: error.message });
    res.status(500).json(apiResponse(false, null, '查询食物失败', error.message));
  }
});

/**
 * GET /api/tools/food/list
 * 获取食物列表
 */
router.get('/tools/food/list', (req, res) => {
  try {
    const categories = foodTool.listAllFoods();
    res.json(apiResponse(true, categories));
  } catch (error) {
    logger.error('获取食物列表失败', { error: error.message });
    res.status(500).json(apiResponse(false, null, '获取食物列表失败', error.message));
  }
});

// ===== 系统 API =====

/**
 * GET /api/health
 * 健康检查
 */
router.get('/health', (req, res) => {
  res.json(apiResponse(true, {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  }));
});

/**
 * GET /api/system/stats
 * 系统统计
 */
router.get('/system/stats', (req, res) => {
  try {
    const sessionStats = sessionManager.getSystemStats();
    const metricsCollector = require('../monitoring/metrics');
    const metrics = metricsCollector.getMetrics();

    res.json(apiResponse(true, {
      sessions: sessionStats,
      metrics,
      uptime: process.uptime(),
    }));
  } catch (error) {
    logger.error('获取系统统计失败', { error: error.message });
    res.status(500).json(apiResponse(false, null, '获取系统统计失败', error.message));
  }
});

module.exports = router;
