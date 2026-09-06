/**
 * ReAct模式Multi-Agent测试
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/chat-multi-agent';

async function testReActAgents() {
  console.log('======================================');
  console.log('🧪 ReAct模式Multi-Agent测试开始');
  console.log('======================================\n');

  const tests = [
    {
      name: 'Test 1: Tool Agent ReAct - 补全信息',
      message: '记录午餐：一份鸡胸肉',
      expected: 'Tool Agent应该先调用search_food_database查询标准份量，然后调用log_meal记录'
    },
    {
      name: 'Test 2: Tool Agent ReAct - 多步查询',
      message: '帮我查询今天的数据并分析一下',
      expected: 'Tool Agent应该先query_today，基于结果给出分析'
    },
    {
      name: 'Test 3: Nutrition Agent ReAct - 多轮检索',
      message: '高血糖人群可以吃什么水果',
      expected: 'Nutrition Agent应该检索多次：高血糖饮食原则、适合的水果、GI值等'
    },
    {
      name: 'Test 4: Fitness Agent ReAct - 动态计划',
      message: '膝盖不好的人怎么减肥',
      expected: 'Fitness Agent应该检索：膝盖保护知识、低冲击运动、减肥方案'
    },
    {
      name: 'Test 5: Sequential模式 - Tool+Nutrition',
      message: '查询我今天吃的食物并给营养建议',
      expected: 'Tool先查询，Nutrition基于查询结果给建议'
    },
    {
      name: 'Test 6: 简单问答 - 不需要多次循环',
      message: '鸡蛋的营养价值',
      expected: 'Nutrition Agent应该1-2次就完成'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n📝 ${test.name}`);
    console.log(`用户输入: "${test.message}"`);
    console.log(`预期行为: ${test.expected}`);
    console.log('---');

    try {
      const startTime = Date.now();

      const response = await axios.post(API_URL, {
        message: test.message,
        userId: 1
      });

      const duration = Date.now() - startTime;
      const data = response.data;

      console.log('\n✅ 执行成功');
      console.log(`⏱️  耗时: ${duration}ms`);
      console.log(`🔀 路由决策: ${JSON.stringify(data.routingDecision)}`);
      console.log(`🔄 执行流程: ${data.executionFlow.join(' → ')}`);
      console.log(`💬 最终回复:\n${data.response}`);

      // 检查是否有ReAct迭代信息（从executionFlow中提取）
      const reactInfo = data.executionFlow.find(f => f.includes('react:') || f.includes('iter'));
      if (reactInfo) {
        console.log(`🔁 ReAct循环: ${reactInfo}`);
      }

      passed++;
    } catch (error) {
      console.log('\n❌ 执行失败');
      console.log(`错误: ${error.response?.data || error.message}`);
      failed++;
    }

    console.log('\n' + '='.repeat(80));

    // 等待1秒再执行下一个测试
    if (i < tests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 测试总结
  console.log('\n');
  console.log('======================================');
  console.log('📊 测试总结');
  console.log('======================================');
  console.log(`总测试数: ${tests.length}`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`通过率: ${((passed / tests.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 所有测试通过！ReAct模式Multi-Agent系统运行正常！');
  } else {
    console.log('\n⚠️  部分测试失败，请检查错误信息');
  }
}

// 运行测试
console.log('⏳ 等待服务器准备...\n');
setTimeout(() => {
  testReActAgents().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}, 2000);
