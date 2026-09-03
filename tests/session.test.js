// 会话和用户管理测试脚本
const { sessionManager, userProfileManager } = require('../session');

async function testSession() {
  console.log('='.repeat(70));
  console.log('会话和用户管理测试');
  console.log('='.repeat(70));

  // 测试1: 创建会话
  console.log('\n【测试1: 创建会话】');
  const session1 = sessionManager.createSession('user123');
  console.log('会话已创建:', {
    sessionId: session1.sessionId,
    userId: session1.userId,
  });

  // 测试2: 添加消息
  console.log('\n【测试2: 添加消息到会话】');
  sessionManager.addMessage(session1.sessionId, 'user', '我想减肥，怎么开始？');
  sessionManager.addMessage(session1.sessionId, 'assistant', '首先需要了解你的基本情况...', {
    intent: 'general',
    agent: 'general_agent',
  });
  sessionManager.addMessage(session1.sessionId, 'user', '我想了解生酮饮食');
  sessionManager.addMessage(session1.sessionId, 'assistant', '生酮饮食是一种...', {
    intent: 'nutrition',
    agent: 'nutrition_agent',
  });

  const messages = sessionManager.getMessages(session1.sessionId);
  console.log(`消息数量: ${messages.length}`);

  // 测试3: 获取上下文
  console.log('\n【测试3: 获取对话上下文】');
  const context = sessionManager.getContext(session1.sessionId, 2);
  console.log('上下文（最近2轮）:');
  console.log(context);

  // 测试4: 会话统计
  console.log('\n【测试4: 会话统计】');
  const stats = sessionManager.getSessionStats(session1.sessionId);
  console.log('会话统计:', JSON.stringify(stats, null, 2));

  // 测试5: 创建用户配置
  console.log('\n【测试5: 创建用户配置】');
  const profile = userProfileManager.setProfile('user123', {
    basicInfo: {
      gender: 'male',
      age: 25,
      height: 175,
      weight: 80,
      targetWeight: 70,
    },
    preferences: {
      dietType: 'balanced',
      exerciseLevel: 'beginner',
      restrictions: ['海鲜过敏'],
    },
    goals: {
      primaryGoal: 'lose_weight',
      weeklyGoal: 0.5,
    },
  });
  console.log('用户配置已创建:', profile.userId);

  // 测试6: 记录体重
  console.log('\n【测试6: 记录体重】');
  userProfileManager.recordWeight('user123', 79.5, '2026-09-01');
  userProfileManager.recordWeight('user123', 79.0, '2026-09-03');
  console.log('体重记录已添加');

  // 测试7: 记录运动
  console.log('\n【测试7: 记录运动】');
  userProfileManager.recordExercise('user123', {
    type: 'HIIT',
    duration: 30,
    date: '2026-09-02',
  });
  userProfileManager.recordExercise('user123', {
    type: '力量训练',
    duration: 45,
    date: '2026-09-03',
  });
  console.log('运动记录已添加');

  // 测试8: 获取进度统计
  console.log('\n【测试8: 获取进度统计】');
  const progressStats = userProfileManager.getProgressStats('user123');
  console.log('进度统计:', JSON.stringify(progressStats, null, 2));

  // 测试9: 生成用户上下文
  console.log('\n【测试9: 生成用户上下文】');
  const userContext = userProfileManager.generateUserContext('user123');
  console.log('用户上下文:');
  console.log(userContext);

  // 测试10: 活跃会话列表
  console.log('\n【测试10: 活跃会话列表】');
  const session2 = sessionManager.createSession('user456');
  sessionManager.addMessage(session2.sessionId, 'user', 'Hello');

  const activeSessions = sessionManager.getActiveSessions();
  console.log(`活跃会话数: ${activeSessions.length}`);
  activeSessions.forEach(s => {
    console.log(`  - ${s.sessionId.substring(0, 8)}... (user: ${s.userId}, messages: ${s.messageCount})`);
  });

  // 测试11: 系统统计
  console.log('\n【测试11: 系统统计】');
  const systemStats = sessionManager.getSystemStats();
  console.log('系统统计:', JSON.stringify(systemStats, null, 2));

  // 测试12: 清除会话
  console.log('\n【测试12: 清除会话】');
  const cleared = sessionManager.clearSession(session2.sessionId);
  console.log(`会话已清除: ${cleared}`);
  console.log(`剩余会话数: ${sessionManager.getSystemStats().totalSessions}`);

  console.log('\n' + '='.repeat(70));
  console.log('测试完成');
  console.log('='.repeat(70));
}

// 运行测试
if (require.main === module) {
  testSession().catch(console.error);
}

module.exports = { testSession };
