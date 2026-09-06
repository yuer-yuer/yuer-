/**
 * Multi-Agent系统测试脚本
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/chat-multi-agent';

async function testMultiAgent() {
  console.log('🧪 开始测试Multi-Agent系统...\n');

  const tests = [
    {
      name: '测试1: 纯营养咨询（单Agent）',
      message: '减肥期间可以吃鸡蛋吗？',
      expectedAgents: ['nutrition_agent'],
      expectedMode: 'single'
    },
    {
      name: '测试2: 纯运动咨询（单Agent）',
      message: '怎么练腹肌？',
      expectedAgents: ['fitness_agent'],
      expectedMode: 'single'
    },
    {
      name: '测试3: 记录数据（单Agent）',
      message: '记录早餐：鸡蛋60克，156卡/100克',
      expectedAgents: ['tool_agent'],
      expectedMode: 'single'
    },
    {
      name: '测试4: 记录+分析（串行Agent）',
      message: '我今天吃了鸡蛋60克，帮我记录并分析营养',
      expectedAgents: ['tool_agent', 'nutrition_agent'],
      expectedMode: 'sequential'
    },
    {
      name: '测试5: 综合健康分析（串行Agent）',
      message: '查询今天的健康数据并给我建议',
      expectedAgents: ['tool_agent', 'nutrition_agent'],
      expectedMode: 'sequential'
    },
    {
      name: '测试6: 复杂表达（测试LLM理解）',
      message: '帮我存一下今天吃的东西，顺便看看健康不',
      expectedAgents: ['tool_agent', 'nutrition_agent'],
      expectedMode: 'sequential'
    }
  ];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📝 ${test.name}`);
    console.log(`💬 消息: ${test.message}`);
    console.log(`🎯 期望: ${test.expectedMode} - ${test.expectedAgents.join(' → ')}`);
    console.log(`${'='.repeat(70)}\n`);

    try {
      const startTime = Date.now();
      const response = await axios.post(API_URL, {
        message: test.message,
        userId: 1
      });

      const duration = Date.now() - startTime;
      const data = response.data;

      console.log(`✅ 响应成功 (${duration}ms)`);
      console.log(`\n🧠 路由决策:`);
      console.log(`   模式: ${data.routingDecision.mode}`);
      console.log(`   Agent: ${data.routingDecision.agents.join(' → ')}`);
      console.log(`   推理: ${data.routingDecision.reasoning}`);

      console.log(`\n🔄 执行流程:`);
      console.log(`   ${data.executionFlow.join(' → ')}`);

      console.log(`\n📊 Agent结果:`);
      if (data.agentResults.tool) {
        console.log(`   🔧 Tool: ${data.agentResults.tool.substring(0, 80)}...`);
      }
      if (data.agentResults.nutrition) {
        console.log(`   🥗 Nutrition: ${data.agentResults.nutrition.substring(0, 80)}...`);
      }
      if (data.agentResults.fitness) {
        console.log(`   💪 Fitness: ${data.agentResults.fitness.substring(0, 80)}...`);
      }

      console.log(`\n💬 最终回复:\n${data.response}\n`);

      // 验证期望
      const matchMode = data.routingDecision.mode === test.expectedMode;
      const matchAgents = JSON.stringify(data.routingDecision.agents) === JSON.stringify(test.expectedAgents);

      if (matchMode && matchAgents) {
        console.log(`✅ 测试通过！路由决策符合预期`);
      } else {
        console.log(`⚠️  路由决策与预期不完全一致`);
        console.log(`   期望模式: ${test.expectedMode}, 实际: ${data.routingDecision.mode}`);
        console.log(`   期望Agent: ${test.expectedAgents.join(',')}, 实际: ${data.routingDecision.agents.join(',')}`);
      }

      // 等待1秒再执行下一个测试
      if (i < tests.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`❌ 测试失败:`, error.response?.data || error.message);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('✅ 所有测试完成！');
  console.log(`${'='.repeat(70)}\n`);
}

// 运行测试
console.log('⏳ 等待服务器准备...\n');
setTimeout(() => {
  testMultiAgent().catch(console.error);
}, 2000);
