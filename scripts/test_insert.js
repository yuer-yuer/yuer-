// 测试完整的插入流程
require('dotenv').config({ path: '.env.agent' });
const { qdrantService, embeddingService } = require('../rag');

async function test() {
  console.log('测试完整插入流程...\n');

  try {
    // 准备测试文档
    const docs = [
      { id: 100, content: '生酮饮食是一种高脂肪、低碳水化合物的饮食方式' },
      { id: 101, content: '有氧运动可以有效燃烧脂肪，提高心肺功能' },
      { id: 102, content: '力量训练能够增加肌肉量，提高基础代谢率' },
    ];

    console.log('1. 生成向量...');
    const embeddings = await embeddingService.embedBatch(docs.map(d => d.content));
    console.log(`✅ 生成了 ${embeddings.length} 个向量`);

    console.log('\n2. 准备数据...');
    const points = docs.map((doc, idx) => ({
      id: doc.id,
      vector: embeddings[idx],
      metadata: {
        content: doc.content,
        category: 'test',
      },
    }));
    console.log(`✅ 准备了 ${points.length} 个数据点`);

    console.log('\n3. 插入Qdrant...');
    await qdrantService.upsert(points);
    console.log('✅ 插入成功！');

    console.log('\n4. 测试搜索...');
    const searchVector = embeddings[0];
    const results = await qdrantService.search(searchVector, 3);
    console.log(`✅ 找到 ${results.length} 个结果:`);
    results.forEach((r, i) => {
      console.log(`   ${i + 1}. [ID:${r.id}] ${r.content.substring(0, 30)}... (score: ${r.score.toFixed(4)})`);
    });

    console.log('\n✅ 测试完成！');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

test();
