// 快速功能测试脚本
require('dotenv').config({ path: '.env.agent' });

async function quickTest() {
  console.log('='.repeat(60));
  console.log('Day 1 & Day 2 快速审查测试');
  console.log('='.repeat(60));

  const results = {
    pass: [],
    fail: [],
  };

  // 测试1: 检查环境变量
  console.log('\n[测试1] 环境变量检查...');
  try {
    if (!process.env.ZHIPU_API_KEY) throw new Error('ZHIPU_API_KEY未设置');
    results.pass.push('环境变量');
    console.log('✅ 环境变量配置正确');
  } catch (error) {
    results.fail.push('环境变量: ' + error.message);
    console.log('❌', error.message);
  }

  // 测试2: 模块加载
  console.log('\n[测试2] 模块加载检查...');
  try {
    const { agentGraph } = require('../agents');
    const { hybridRetriever } = require('../rag');
    const logger = require('../monitoring/logger');
    const metricsCollector = require('../monitoring/metrics');
    const cacheManager = require('../monitoring/cache');

    results.pass.push('模块加载');
    console.log('✅ 所有核心模块加载成功');
  } catch (error) {
    results.fail.push('模块加载: ' + error.message);
    console.log('❌', error.message);
  }

  // 测试3: 意图分类
  console.log('\n[测试3] 意图分类测试...');
  try {
    const classifyIntentNode = require('../agents/nodes/classifier');

    const nutritionTest = await classifyIntentNode({
      messages: [{ role: 'user', content: '我今天吃了炸鸡' }],
    });

    const fitnessTest = await classifyIntentNode({
      messages: [{ role: 'user', content: '我想做HIIT训练' }],
    });

    const generalTest = await classifyIntentNode({
      messages: [{ role: 'user', content: '你好' }],
    });

    if (nutritionTest.intent === 'nutrition' &&
        fitnessTest.intent === 'fitness' &&
        generalTest.intent === 'general') {
      results.pass.push('意图分类');
      console.log('✅ 意图分类准确');
      console.log('  - 营养问题 → nutrition ✓');
      console.log('  - 运动问题 → fitness ✓');
      console.log('  - 通用问题 → general ✓');
    } else {
      throw new Error('意图分类错误');
    }
  } catch (error) {
    results.fail.push('意图分类: ' + error.message);
    console.log('❌', error.message);
  }

  // 测试4: 内存搜索
  console.log('\n[测试4] 内存搜索测试...');
  try {
    const elasticsearchService = require('../rag/elasticsearch');

    // 检查文档是否已加载到内存
    if (elasticsearchService.documents && elasticsearchService.documents.length > 0) {
      console.log(`✅ 内存搜索可用 (${elasticsearchService.documents.length}个文档块)`);

      // 测试搜索
      const results = await elasticsearchService.search('热量', 3);
      console.log(`  - 搜索"热量"找到 ${results.length} 个结果`);

      results.pass.push('内存搜索');
    } else {
      console.log('⚠️  内存搜索为空，需要运行 init_knowledge.js');
      results.fail.push('内存搜索: 无数据');
    }
  } catch (error) {
    results.fail.push('内存搜索: ' + error.message);
    console.log('❌', error.message);
  }

  // 测试5: 缓存管理器
  console.log('\n[测试5] 缓存管理器测试...');
  try {
    const cacheManager = require('../monitoring/cache');

    // 测试内存缓存
    await cacheManager.set('test_key', { data: 'test_value' }, 60);
    const cached = await cacheManager.get('test_key');

    if (cached && cached.data === 'test_value') {
      results.pass.push('缓存管理器');
      console.log('✅ 缓存管理器工作正常（内存模式）');
    } else {
      throw new Error('缓存读写失败');
    }
  } catch (error) {
    results.fail.push('缓存管理器: ' + error.message);
    console.log('❌', error.message);
  }

  // 测试6: 日志系统
  console.log('\n[测试6] 日志系统测试...');
  try {
    const logger = require('../monitoring/logger');
    logger.info('测试日志消息');

    results.pass.push('日志系统');
    console.log('✅ 日志系统工作正常');
  } catch (error) {
    results.fail.push('日志系统: ' + error.message);
    console.log('❌', error.message);
  }

  // 测试7: 指标收集器
  console.log('\n[测试7] 指标收集器测试...');
  try {
    const metricsCollector = require('../monitoring/metrics');

    metricsCollector.recordAgentCall('test_agent');
    metricsCollector.recordLLMCall('glm-4-flash', {
      prompt: 100,
      completion: 50,
      total: 150,
    });

    const metrics = metricsCollector.getMetrics();

    if (metrics.agents.totalCalls > 0 && metrics.llm.totalCalls > 0) {
      results.pass.push('指标收集器');
      console.log('✅ 指标收集器工作正常');
      console.log(`  - Agent调用: ${metrics.agents.totalCalls}次`);
      console.log(`  - LLM调用: ${metrics.llm.totalCalls}次`);
    } else {
      throw new Error('指标统计错误');
    }
  } catch (error) {
    results.fail.push('指标收集器: ' + error.message);
    console.log('❌', error.message);
  }

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('测试总结');
  console.log('='.repeat(60));
  console.log(`✅ 通过: ${results.pass.length}个测试`);
  results.pass.forEach(name => console.log(`  - ${name}`));

  if (results.fail.length > 0) {
    console.log(`\n❌ 失败: ${results.fail.length}个测试`);
    results.fail.forEach(name => console.log(`  - ${name}`));
  }

  console.log('\n' + '='.repeat(60));

  const passRate = ((results.pass.length / (results.pass.length + results.fail.length)) * 100).toFixed(0);
  console.log(`通过率: ${passRate}%`);

  if (results.fail.length === 0) {
    console.log('🎉 所有测试通过！Day 1 & Day 2 可以交付');
  } else {
    console.log('⚠️  部分测试失败，需要修复');
  }
  console.log('='.repeat(60));
}

if (require.main === module) {
  quickTest().catch(console.error);
}

module.exports = { quickTest };
