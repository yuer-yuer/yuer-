// 快速验证内存搜索的分词功能
const elasticsearch = require('../rag/elasticsearch');

// 创建测试文档
const testDocs = [
  {
    id: 'doc1',
    content: '生酮饮食（Ketogenic Diet）是一种极低碳水、高脂肪的饮食方式',
    metadata: { category: 'nutrition', source: 'test1.md', chunk_index: 0 }
  },
  {
    id: 'doc2',
    content: 'HIIT高强度间歇训练是一种高效的减脂运动方式',
    metadata: { category: 'fitness', source: 'test2.md', chunk_index: 0 }
  },
  {
    id: 'doc3',
    content: '力量训练可以提高基础代谢率，对减脂有很大帮助',
    metadata: { category: 'fitness', source: 'test3.md', chunk_index: 0 }
  },
];

async function quickTest() {
  console.log('快速验证内存搜索\n');

  // 加载测试文档
  elasticsearch.documents = testDocs;
  console.log(`已加载 ${testDocs.length} 个测试文档\n`);

  // 测试查询
  const queries = [
    { q: '生酮饮食', cat: 'nutrition' },
    { q: 'HIIT训练', cat: 'fitness' },
    { q: '减脂', cat: null },
  ];

  for (const { q, cat } of queries) {
    console.log(`查询: "${q}" [${cat || '全部'}]`);
    const results = await elasticsearch.search(q, 3, cat);
    console.log(`结果: ${results.length}个`);

    results.forEach((r, i) => {
      console.log(`  ${i+1}. [分数:${r.score}] ${r.content}`);
    });
    console.log('');
  }
}

quickTest().catch(console.error);
