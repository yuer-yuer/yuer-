// RAG检索测试脚本
require('dotenv').config({ path: '.env.agent' });
const { hybridRetriever, elasticsearchService } = require('../rag');
const logger = require('../monitoring/logger');
const fs = require('fs');
const path = require('path');

// 加载知识库到内存（用于测试）
async function loadKnowledgeToMemory() {
  console.log('加载知识库到内存...');

  const knowledgeDir = path.join(__dirname, '../knowledge');
  let allChunks = [];

  // 读取营养知识
  const nutritionDir = path.join(knowledgeDir, 'nutrition');
  const nutritionFiles = fs.readdirSync(nutritionDir)
    .filter(f => f.endsWith('.md') && f !== '00_index.md');

  for (const file of nutritionFiles) {
    const content = fs.readFileSync(path.join(nutritionDir, file), 'utf-8');
    const chunks = chunkDocument(content, file, 'nutrition');
    allChunks.push(...chunks);
  }

  // 读取运动知识
  const fitnessDir = path.join(knowledgeDir, 'fitness');
  const fitnessFiles = fs.readdirSync(fitnessDir)
    .filter(f => f.endsWith('.md') && f !== '00_index.md');

  for (const file of fitnessFiles) {
    const content = fs.readFileSync(path.join(fitnessDir, file), 'utf-8');
    const chunks = chunkDocument(content, file, 'fitness');
    allChunks.push(...chunks);
  }

  // 直接加载到ES内存
  await elasticsearchService.bulkIndex(allChunks);

  console.log(`✅ 已加载 ${allChunks.length} 个文档块到内存`);
  return allChunks;
}

// 文档分块（复用init_knowledge的逻辑）
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

async function testRAG() {
  console.log('='.repeat(60));
  console.log('RAG混合检索测试');
  console.log('='.repeat(60));

  // 先加载知识库
  await loadKnowledgeToMemory();

  const testQueries = [
    {
      name: '营养问题：生酮饮食',
      query: '生酮饮食是什么？',
      category: 'nutrition',
    },
    {
      name: '营养问题：热量计算',
      query: '怎么计算每天需要多少热量？',
      category: 'nutrition',
    },
    {
      name: '运动问题：HIIT训练',
      query: 'HIIT训练怎么做？',
      category: 'fitness',
    },
    {
      name: '运动问题：力量训练',
      query: '力量训练对减脂有帮助吗？',
      category: 'fitness',
    },
    {
      name: '综合问题：不限类别',
      query: '如何快速减脂？',
      category: null,
    },
  ];

  for (const test of testQueries) {
    console.log('\n' + '-'.repeat(60));
    console.log(`测试：${test.name}`);
    console.log(`查询：${test.query}`);
    console.log(`类别：${test.category || '全部'}`);
    console.log('-'.repeat(60));

    try {
      const startTime = Date.now();

      // 先测试关键词搜索
      console.log('\n【关键词搜索】');
      const keywordResults = await elasticsearchService.search(
        test.query,
        3,
        test.category
      );
      console.log(`找到 ${keywordResults.length} 个结果`);
      keywordResults.forEach((result, idx) => {
        console.log(`  ${idx + 1}. [分数:${result.score.toFixed(2)}] ${result.content.substring(0, 60)}...`);
      });

      // 测试混合检索（如果向量可用）
      console.log('\n【混合检索】');
      try {
        const hybridResults = await hybridRetriever.retrieve(
          test.query,
          test.category
        );

        console.log(`找到 ${hybridResults.length} 个结果`);
        hybridResults.forEach((result, idx) => {
          console.log(`  ${idx + 1}. [分数:${result.score.toFixed(3)}] ${result.content.substring(0, 60)}...`);
          console.log(`      来源: ${result.metadata.source}`);
        });

        const duration = Date.now() - startTime;
        console.log(`\n检索耗时: ${duration}ms`);
      } catch (error) {
        console.log(`⚠️  混合检索失败: ${error.message}`);
        console.log('    使用关键词搜索降级');
      }

      // 等待1秒，避免API限流
      await sleep(1000);
    } catch (error) {
      console.error(`❌ 测试失败:`, error.message);
    }
  }

  // 统计信息
  console.log('\n' + '='.repeat(60));
  console.log('统计信息');
  console.log('='.repeat(60));

  console.log(`内存文档数: ${elasticsearchService.documents.length}`);
  console.log(`营养知识: ${elasticsearchService.documents.filter(d => d.metadata.category === 'nutrition').length}块`);
  console.log(`运动知识: ${elasticsearchService.documents.filter(d => d.metadata.category === 'fitness').length}块`);

  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行测试
if (require.main === module) {
  testRAG().catch(console.error);
}

module.exports = { testRAG };
