// Agent测试脚本
require('dotenv').config({ path: '.env.agent' });
const { agentGraph } = require('../agents');
const logger = require('../monitoring/logger');

async function testAgents() {
  console.log('='.repeat(60));
  console.log('Agent系统测试');
  console.log('='.repeat(60));

  const testCases = [
    {
      name: '营养问题测试',
      message: '我今天吃了炸鸡会不会胖？',
      expectedIntent: 'nutrition',
    },
    {
      name: '运动问题测试',
      message: '我想做HIIT训练，怎么开始？',
      expectedIntent: 'fitness',
    },
    {
      name: '通用问题测试',
      message: '你好',
      expectedIntent: 'general',
    },
  ];

  for (const testCase of testCases) {
    console.log('\n' + '-'.repeat(60));
    console.log(`测试：${testCase.name}`);
    console.log(`输入：${testCase.message}`);
    console.log('-'.repeat(60));

    try {
      const result = await agentGraph.invoke({
        message: testCase.message,
        userId: 'test_user',
      });

      console.log(`\n意图：${result.intent} ${result.intent === testCase.expectedIntent ? '✅' : '❌'}`);
      console.log(`Agent：${result.agent}`);
      console.log(`知识库使用：${result.knowledgeUsed}个文档块`);
      console.log(`耗时：${result.duration}ms`);
      console.log(`\n回复：\n${result.reply}`);

      // 等待1秒，避免API限流
      await sleep(1000);
    } catch (error) {
      console.error(`❌ 测试失败:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行测试
if (require.main === module) {
  testAgents().catch(console.error);
}

module.exports = { testAgents };
