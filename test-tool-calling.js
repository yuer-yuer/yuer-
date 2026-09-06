/**
 * 工具调用测试脚本
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/chat-langgraph';

async function testToolCalling() {
  console.log('🧪 开始测试工具调用功能...\n');

  const tests = [
    {
      name: '测试1: 记录早餐',
      message: '记录早餐：一个鸡蛋60克，热量每100克156卡路里',
      userId: 1
    },
    {
      name: '测试2: 记录运动',
      message: '记录运动：跑步30分钟，消耗300卡路里',
      userId: 1
    },
    {
      name: '测试3: 记录体重',
      message: '记录体重：70.5公斤',
      userId: 1
    },
    {
      name: '测试4: 查询今日汇总',
      message: '查询今天吃了什么，运动了什么',
      userId: 1
    },
    {
      name: '测试5: 营养咨询（不应触发工具）',
      message: '减肥期间可以吃鸡蛋吗',
      userId: 1
    }
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 ${test.name}`);
    console.log(`💬 消息: ${test.message}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      const response = await axios.post(API_URL, {
        message: test.message,
        userId: test.userId
      });

      const data = response.data;

      console.log(`✅ 响应成功`);
      console.log(`📊 意图: ${data.intent}`);
      console.log(`🔧 工具调用数: ${data.toolCalls}`);
      console.log(`📈 RAG结果数: ${data.ragCount}`);

      if (data.toolResults && data.toolResults.length > 0) {
        console.log(`\n🛠️ 工具执行结果:`);
        data.toolResults.forEach((result, i) => {
          console.log(`  ${i + 1}. ${result.tool_name}: ${result.success ? '✅ 成功' : '❌ 失败'}`);
          if (result.result) {
            console.log(`     ${JSON.stringify(result.result, null, 2).split('\n').join('\n     ')}`);
          }
        });
      }

      console.log(`\n💬 助手回复:\n${data.response}`);

      // 等待1秒再执行下一个测试
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ 测试失败:`, error.response?.data || error.message);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ 所有测试完成！');
  console.log(`${'='.repeat(60)}\n`);
}

// 运行测试
testToolCalling().catch(console.error);
