// 工具测试脚本
require('dotenv').config({ path: '.env.agent' });
const { calculatorTool, foodTool, knowledgeTool, executeTool } = require('../tools');

async function testTools() {
  console.log('='.repeat(70));
  console.log('工具测试');
  console.log('='.repeat(70));

  // 测试1: 计算引擎 - BMR
  console.log('\n【测试1: 计算BMR】');
  const bmrResult = await calculatorTool.execute({
    calc_type: 'bmr',
    gender: 'male',
    age: 25,
    height: 175,
    weight: 75,
  });
  console.log('结果:', JSON.stringify(bmrResult, null, 2));

  // 测试2: 计算引擎 - TDEE
  console.log('\n【测试2: 计算TDEE】');
  const tdeeResult = await calculatorTool.execute({
    calc_type: 'tdee',
    gender: 'male',
    age: 25,
    height: 175,
    weight: 75,
    activity_level: 1.5,
  });
  console.log('结果:', JSON.stringify(tdeeResult, null, 2));

  // 测试3: 计算引擎 - 热量缺口和宏量营养素
  console.log('\n【测试3: 计算热量缺口】');
  const deficitResult = await calculatorTool.execute({
    calc_type: 'deficit',
    gender: 'male',
    age: 25,
    height: 175,
    weight: 75,
    activity_level: 1.5,
    goal: 'lose_weight_moderate',
  });
  console.log('结果:', JSON.stringify(deficitResult, null, 2));

  // 测试4: 食物查询 - 鸡胸肉
  console.log('\n【测试4: 查询鸡胸肉营养】');
  const chickenResult = await foodTool.execute({
    food_name: '鸡胸肉',
    amount: 150,
  });
  console.log('结果:', JSON.stringify(chickenResult, null, 2));

  // 测试5: 食物查询 - 苹果
  console.log('\n【测试5: 查询苹果营养】');
  const appleResult = await foodTool.execute({
    food_name: '苹果',
    amount: 200,
  });
  console.log('结果:', JSON.stringify(appleResult, null, 2));

  // 测试6: 食物查询 - 不存在的食物
  console.log('\n【测试6: 查询不存在的食物】');
  const unknownResult = await foodTool.execute({
    food_name: '榴莲',
    amount: 100,
  });
  console.log('结果:', JSON.stringify(unknownResult, null, 2));

  // 测试7: 知识检索
  console.log('\n【测试7: 知识检索 - 生酮饮食】');
  const knowledgeResult = await knowledgeTool.execute({
    query: '生酮饮食',
    category: 'nutrition',
    top_k: 2,
  });
  console.log(`成功: ${knowledgeResult.success}`);
  if (knowledgeResult.success) {
    console.log(`结果数: ${knowledgeResult.data.results_count}`);
    knowledgeResult.data.results.forEach(r => {
      console.log(`  - [${r.score.toFixed(3)}] ${r.content.substring(0, 80)}...`);
    });
  }

  // 测试8: 通过executeTool统一调用
  console.log('\n【测试8: 统一工具调用接口】');
  const unifiedResult = await executeTool('calc_engine', {
    calc_type: 'body_fat',
    gender: 'female',
    age: 30,
    height: 165,
    weight: 60,
  });
  console.log('结果:', JSON.stringify(unifiedResult, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log('测试完成');
  console.log('='.repeat(70));
}

// 运行测试
if (require.main === module) {
  testTools().catch(console.error);
}

module.exports = { testTools };
