// 简化的RAG测试 - 仅测试内存搜索
require('dotenv').config({ path: '.env.agent' });
const { elasticsearchService } = require('../rag');
const fs = require('fs');
const path = require('path');

// 文档分块
function chunkDocument(content, filename, category) {
  const paragraphs = content
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 50);

  return paragraphs.map((para, idx) => ({
    id: `${filename.replace('.md', '')}_chunk_${idx}`,
    content: para,
    metadata: {
      source: filename,
      category,
      chunk_index: idx,
    },
  }));
}

async function simpleTest() {
  console.log('简化RAG测试 - 内存搜索');
  console.log('='.repeat(60));

  // 加载知识库
  console.log('\n1. 加载知识库...');
  const knowledgeDir = path.join(__dirname, '../knowledge');
  let allChunks = [];

  ['nutrition', 'fitness'].forEach(category => {
    const dir = path.join(knowledgeDir, category);
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.md') && f !== '00_index.md');

    files.forEach(file => {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const chunks = chunkDocument(content, file, category);
      allChunks.push(...chunks);
      console.log(`   ${file}: ${chunks.length}块`);
    });
  });

  console.log(`✅ 加载完成: ${allChunks.length}个文档块`);

  // 存储到ES内存
  console.log('\n2. 存储到内存...');
  await elasticsearchService.bulkIndex(allChunks);
  console.log(`✅ 内存文档数: ${elasticsearchService.documents.length}`);

  // 测试搜索
  console.log('\n3. 测试搜索功能');
  console.log('-'.repeat(60));

  const queries = [
    { q: '生酮饮食', cat: 'nutrition' },
    { q: 'HIIT', cat: 'fitness' },
    { q: '减脂', cat: null },
  ];

  for (const { q, cat } of queries) {
    console.log(`\n查询: "${q}" [${cat || '全部'}]`);
    const results = await elasticsearchService.search(q, 3, cat);
    console.log(`结果: ${results.length}个`);

    results.forEach((r, i) => {
      console.log(`  ${i+1}. [分数:${r.score}] ${r.content.substring(0, 80)}...`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
}

simpleTest().catch(console.error);
