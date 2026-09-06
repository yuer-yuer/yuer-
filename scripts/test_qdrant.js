// Qdrant连接测试
require('dotenv').config({ path: '.env.agent' });
const { QdrantClient } = require('@qdrant/js-client-rest');

async function testQdrant() {
  console.log('测试Qdrant连接...\n');

  try {
    // 创建客户端（禁用版本检查）
    const client = new QdrantClient({
      url: 'http://localhost:6333',
      checkCompatibility: false,
    });

    // 1. 测试连接
    console.log('1. 测试获取集合列表...');
    const collections = await client.getCollections();
    console.log(`✅ 成功！找到 ${collections.collections.length} 个集合`);
    collections.collections.forEach(c => {
      console.log(`   - ${c.name}`);
    });

    // 2. 测试插入一个向量
    const collectionName = 'manmanshou_knowledge';
    console.log('\n2. 测试插入向量...');

    const testPoint = {
      id: 999999, // 使用数字ID
      vector: Array(1024).fill(0).map(() => Math.random()),
      payload: {
        content: '这是一个测试向量',
        category: 'test',
      },
    };

    await client.upsert(collectionName, {
      points: [testPoint],
    });
    console.log('✅ 插入成功！');

    // 3. 测试搜索
    console.log('\n3. 测试向量搜索...');
    const searchResults = await client.query(collectionName, {
      query: testPoint.vector,
      limit: 3,
      with_payload: true,
    });
    console.log(`✅ 搜索成功！找到 ${searchResults.points.length} 个结果`);
    searchResults.points.forEach((r, idx) => {
      console.log(`   ${idx + 1}. ID: ${r.id}, Score: ${r.score.toFixed(4)}`);
    });

    // 4. 删除测试向量
    console.log('\n4. 清理测试数据...');
    await client.delete(collectionName, {
      points: [999999],
    });
    console.log('✅ 清理完成！');

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Qdrant测试全部通过！');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

testQdrant();
