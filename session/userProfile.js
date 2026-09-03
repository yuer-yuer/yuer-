// 用户配置管理器
const logger = require('../monitoring/logger');
const fs = require('fs');
const path = require('path');

class UserProfileManager {
  constructor() {
    // 内存存储用户配置
    this.profiles = new Map();

    // 存储目录
    this.storageDir = path.join(__dirname, '../data/users');
    this.ensureStorageDir();

    // 加载已有配置
    this.loadProfiles();
  }

  /**
   * 确保存储目录存在
   */
  ensureStorageDir() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
      logger.info('用户数据目录已创建', { dir: this.storageDir });
    }
  }

  /**
   * 加载所有用户配置
   */
  loadProfiles() {
    try {
      const files = fs.readdirSync(this.storageDir);

      files.forEach(file => {
        if (file.endsWith('.json')) {
          const userId = file.replace('.json', '');
          const filePath = path.join(this.storageDir, file);
          const data = fs.readFileSync(filePath, 'utf-8');
          const profile = JSON.parse(data);
          this.profiles.set(userId, profile);
        }
      });

      logger.info('用户配置加载完成', { count: this.profiles.size });
    } catch (error) {
      logger.warn('加载用户配置失败', { error: error.message });
    }
  }

  /**
   * 创建或更新用户配置
   */
  setProfile(userId, profileData) {
    const existingProfile = this.profiles.get(userId);

    const profile = {
      userId,
      basicInfo: profileData.basicInfo || existingProfile?.basicInfo || {
        gender: null,
        age: null,
        height: null,
        weight: null,
        targetWeight: null,
      },
      preferences: profileData.preferences || existingProfile?.preferences || {
        dietType: 'balanced',
        exerciseLevel: 'beginner',
        restrictions: [],
      },
      goals: profileData.goals || existingProfile?.goals || {
        primaryGoal: 'lose_weight',
        targetDate: null,
        weeklyGoal: 0.5, // kg/week
      },
      progress: existingProfile?.progress || {
        weightHistory: [],
        exerciseHistory: [],
        lastUpdated: null,
      },
      createdAt: existingProfile?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    // 保存到内存
    this.profiles.set(userId, profile);

    // 持久化到文件
    this.saveProfile(userId, profile);

    logger.info('用户配置已更新', { userId });

    return profile;
  }

  /**
   * 获取用户配置
   */
  getProfile(userId) {
    return this.profiles.get(userId) || null;
  }

  /**
   * 记录体重
   */
  recordWeight(userId, weight, date = null) {
    const profile = this.getProfile(userId);

    if (!profile) {
      throw new Error(`用户不存在: ${userId}`);
    }

    const record = {
      date: date || new Date().toISOString().split('T')[0],
      weight: parseFloat(weight),
      timestamp: Date.now(),
    };

    profile.progress.weightHistory.push(record);
    profile.progress.lastUpdated = Date.now();

    // 更新当前体重
    profile.basicInfo.weight = weight;

    // 限制历史记录数量（保留最近100条）
    if (profile.progress.weightHistory.length > 100) {
      profile.progress.weightHistory.shift();
    }

    this.saveProfile(userId, profile);

    logger.info('体重记录已添加', { userId, weight, date: record.date });

    return record;
  }

  /**
   * 记录运动
   */
  recordExercise(userId, exerciseData) {
    const profile = this.getProfile(userId);

    if (!profile) {
      throw new Error(`用户不存在: ${userId}`);
    }

    const record = {
      date: exerciseData.date || new Date().toISOString().split('T')[0],
      type: exerciseData.type,
      duration: exerciseData.duration, // 分钟
      calories: exerciseData.calories || null,
      notes: exerciseData.notes || '',
      timestamp: Date.now(),
    };

    profile.progress.exerciseHistory.push(record);
    profile.progress.lastUpdated = Date.now();

    // 限制历史记录数量（保留最近100条）
    if (profile.progress.exerciseHistory.length > 100) {
      profile.progress.exerciseHistory.shift();
    }

    this.saveProfile(userId, profile);

    logger.info('运动记录已添加', { userId, type: record.type, duration: record.duration });

    return record;
  }

  /**
   * 获取用户进度统计
   */
  getProgressStats(userId) {
    const profile = this.getProfile(userId);

    if (!profile) {
      return null;
    }

    const { basicInfo, progress } = profile;
    const weightHistory = progress.weightHistory;

    // 计算体重变化
    let weightChange = 0;
    let startWeight = null;

    if (weightHistory.length > 0) {
      startWeight = weightHistory[0].weight;
      const currentWeight = basicInfo.weight || weightHistory[weightHistory.length - 1].weight;
      weightChange = currentWeight - startWeight;
    }

    // 计算目标进度
    let goalProgress = 0;
    if (basicInfo.targetWeight && startWeight) {
      const totalGoal = startWeight - basicInfo.targetWeight;
      goalProgress = totalGoal > 0 ? (Math.abs(weightChange) / totalGoal) * 100 : 0;
    }

    // 统计运动记录
    const totalExercises = progress.exerciseHistory.length;
    const last7Days = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentExercises = progress.exerciseHistory.filter(e => e.timestamp > last7Days).length;

    return {
      userId,
      currentWeight: basicInfo.weight,
      targetWeight: basicInfo.targetWeight,
      startWeight,
      weightChange: Math.round(weightChange * 10) / 10,
      goalProgress: Math.round(goalProgress),
      totalWeightRecords: weightHistory.length,
      totalExercises,
      recentExercises,
      lastUpdated: progress.lastUpdated ? new Date(progress.lastUpdated).toISOString() : null,
    };
  }

  /**
   * 生成用户上下文（供Agent使用）
   */
  generateUserContext(userId) {
    const profile = this.getProfile(userId);

    if (!profile) {
      return '【用户信息】无用户配置';
    }

    const { basicInfo, preferences, goals, progress } = profile;

    let context = '【用户信息】\n\n';

    // 基本信息
    if (basicInfo.gender || basicInfo.age || basicInfo.height || basicInfo.weight) {
      context += '基本信息：\n';
      if (basicInfo.gender) context += `- 性别：${basicInfo.gender === 'male' ? '男' : '女'}\n`;
      if (basicInfo.age) context += `- 年龄：${basicInfo.age}岁\n`;
      if (basicInfo.height) context += `- 身高：${basicInfo.height}cm\n`;
      if (basicInfo.weight) context += `- 体重：${basicInfo.weight}kg\n`;
      if (basicInfo.targetWeight) context += `- 目标体重：${basicInfo.targetWeight}kg\n`;
      context += '\n';
    }

    // 偏好设置
    context += '偏好设置：\n';
    context += `- 饮食类型：${this._getDietTypeLabel(preferences.dietType)}\n`;
    context += `- 运动水平：${this._getExerciseLevelLabel(preferences.exerciseLevel)}\n`;
    if (preferences.restrictions.length > 0) {
      context += `- 饮食限制：${preferences.restrictions.join('、')}\n`;
    }
    context += '\n';

    // 目标
    context += '减重目标：\n';
    context += `- 主要目标：${this._getGoalLabel(goals.primaryGoal)}\n`;
    if (goals.weeklyGoal) {
      context += `- 每周目标：${goals.weeklyGoal}kg\n`;
    }
    context += '\n';

    // 进度
    if (progress.weightHistory.length > 0) {
      const stats = this.getProgressStats(userId);
      context += '当前进度：\n';
      context += `- 体重变化：${stats.weightChange > 0 ? '+' : ''}${stats.weightChange}kg\n`;
      if (stats.goalProgress > 0) {
        context += `- 目标完成度：${stats.goalProgress}%\n`;
      }
      context += `- 最近7天运动次数：${stats.recentExercises}次\n`;
    }

    return context;
  }

  /**
   * 保存配置到文件
   */
  saveProfile(userId, profile) {
    try {
      const filePath = path.join(this.storageDir, `${userId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf-8');
    } catch (error) {
      logger.error('保存用户配置失败', { userId, error: error.message });
    }
  }

  /**
   * 删除用户配置
   */
  deleteProfile(userId) {
    this.profiles.delete(userId);

    try {
      const filePath = path.join(this.storageDir, `${userId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      logger.info('用户配置已删除', { userId });
      return true;
    } catch (error) {
      logger.error('删除用户配置失败', { userId, error: error.message });
      return false;
    }
  }

  // 辅助方法
  _getDietTypeLabel(type) {
    const labels = {
      balanced: '均衡饮食',
      keto: '生酮饮食',
      vegan: '素食',
      low_carb: '低碳水',
    };
    return labels[type] || type;
  }

  _getExerciseLevelLabel(level) {
    const labels = {
      beginner: '初学者',
      intermediate: '中级',
      advanced: '高级',
    };
    return labels[level] || level;
  }

  _getGoalLabel(goal) {
    const labels = {
      lose_weight: '减重',
      gain_muscle: '增肌',
      maintain: '保持',
      improve_health: '改善健康',
    };
    return labels[goal] || goal;
  }
}

// 单例
const userProfileManager = new UserProfileManager();

module.exports = userProfileManager;
