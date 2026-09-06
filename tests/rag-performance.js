// RAG性能对比测试
require('dotenv').config({ path: '.env.agent' });
const { hybridRetriever, elasticsearchService } = require('../rag');
const fs = require('fs');
const path = require('path');

// 加载知识库
function loadKnowledge() {
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
    });
  });

  return allChunks;
}

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

async function runPerformanceTest() {
  console.log('='.repeat(70));
  console.log('RAG性能对比测试');
  console.log('='.repeat(70));

  // 加载知识库
  console.log('\n准备数据...');
  const allChunks = loadKnowledge();
  await elasticsearchService.bulkIndex(allChunks);
  console.log(`✅ 已加载 ${allChunks.length} 个文档块\n`);

  // 测试用例
  const testCases = [
    {
      name: '营养-生酮饮食',
      query: '生酮饮食的原理和注意事项',
      category: 'nutrition',
      expectedKeywords: ['生酮', '碳水', '酮体', '脂肪'],
    },
    {
      name: '营养-热量计算',
      query: '如何计算基础代谢率和每日热量需求',
      category: 'nutrition',
      expectedKeywords: ['基础代谢', '热量', 'TDEE', 'BMR'],
    },
    {
      name: '运动-HIIT训练',
      query: 'HIIT高强度间歇训练的方法',
      category: 'fitness',
      expectedKeywords: ['HIIT', '间歇', '心率', '强度'],
    },
    {
      name: '运动-力量训练',
      query: '力量训练对减脂的作用',
      category: 'fitness',
      expectedKeywords: ['力量', '肌肉', '减脂', '基础代谢'],
    },
    {
      name: '综合-快速减脂',
      query: '最有效的减脂方法是什么',
      category: null,
      expectedKeywords: ['热量', '运动', '饮食', '减脂'],
    },
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log('-'.repeat(70));
    console.log(`测试: ${testCase.name}`);
    console.log(`查询: "${testCase.query}"`);
    console.log(`类别: ${testCase.category || '全部'}`);
    console.log('-'.repeat(70));

    // 方法1: 纯关键词搜索
    console.log('\n【方法1: 纯关键词搜索】');
    const t1 = Date.now();
    const keywordResults = await elasticsearchService.search(
      testCase.query,
      5,
      testCase.category
    );
    const keywordTime = Date.now() - t1;

    console.log(`耗时: ${keywordTime}ms | 结果: ${keywordResults.length}个`);
    if (keywordResults.length > 0) {
      console.log(`Top1: [分数:${keywordResults[0].score.toFixed(2)}] ${keywordResults[0].content.substring(0, 80)}...`);
    }

    // 方法2: 混合检索（向量+关键词）
    console.log('\n【方法2: 混合检索】');
    const t2 = Date.now();
    let hybridResults = [];
    let hybridTime = 0;
    let hybridError = null;

    try {
      hybridResults = await hybridRetriever.retrieve(
        testCase.query,
        testCase.category
      );
      hybridTime = Date.now() - t2;
      console.log(`耗时: ${hybridTime}ms | 结果: ${hybridResults.length}个`);
      if (hybridResults.length > 0) {
        console.log(`Top1: [分数:${hybridResults[0].score.toFixed(3)}] ${hybridResults[0].content.substring(0, 80)}...`);
      }
    } catch (error) {
      hybridError = error.message;
      console.log(`❌ 失败: ${error.message}`);
    }

    // 评估相关性（简单的关键词匹配）
    const keywordRelevance = evaluateRelevance(
      keywordResults,
      testCase.expectedKeywords
    );
    const hybridRelevance = evaluateRelevance(
      hybridResults,
      testCase.expectedKeywords
    );

    console.log('\n【相关性评分】');
    console.log(`关键词搜索: ${keywordRelevance.toFixed(2)}`);
    console.log(`混合检索: ${hybridRelevance.toFixed(2)}`);

    results.push({
      testCase: testCase.name,
      keywordTime,
      hybridTime,
      keywordCount: keywordResults.length,
      hybridCount: hybridResults.length,
      keywordRelevance,
      hybridRelevance,
      hybridError,
    });

    console.log('');
    await sleep(500); // 避免API限流
  }

  // 汇总报告
  console.log('='.repeat(70));
  console.log('测试汇总');
  console.log('='.repeat(70));

  console.log('\n性能对比:');
  console.log('测试用例'.padEnd(20) + '关键词(ms)'.padEnd(15) + '混合(ms)'.padEnd(15) + '结果数对比');
  console.log('-'.repeat(70));

  results.forEach(r => {
    const name = r.testCase.substring(0, 18).padEnd(20);
    const kwTime = String(r.keywordTime).padEnd(15);
    const hybTime = r.hybridError ? '失败'.padEnd(15) : String(r.hybridTime).padEnd(15);
    const counts = `${r.keywordCount} vs ${r.hybridCount}`;
    console.log(name + kwTime + hybTime + counts);
  });

  console.log('\n相关性对比:');
  console.log('测试用例'.padEnd(20) + '关键词'.padEnd(15) + '混合'.padEnd(15) + '优势');
  console.log('-'.repeat(70));

  results.forEach(r => {
    const name = r.testCase.substring(0, 18).padEnd(20);
    const kwRel = r.keywordRelevance.toFixed(2).padEnd(15);
    const hybRel = r.hybridRelevance.toFixed(2).padEnd(15);
    const winner = r.hybridRelevance > r.keywordRelevance ? '混合检索' :
                   r.hybridRelevance < r.keywordRelevance ? '关键词' : '平局';
    console.log(name + kwRel + hybRel + winner);
  });

  // 平均指标
  const avgKeywordTime = average(results.map(r => r.keywordTime));
  const validHybridTimes = results.filter(r => !r.hybridError).map(r => r.hybridTime);
  const avgHybridTime = validHybridTimes.length > 0 ? average(validHybridTimes) : 0;
  const avgKeywordRel = average(results.map(r => r.keywordRelevance));
  const avgHybridRel = average(results.map(r => r.hybridRelevance));

  console.log('\n平均性能:');
  console.log(`  关键词搜索: ${avgKeywordTime.toFixed(0)}ms | 相关性: ${avgKeywordRel.toFixed(2)}`);
  console.log(`  混合检索: ${avgHybridTime > 0 ? avgHybridTime.toFixed(0) + 'ms' : '不可用'} | 相关性: ${avgHybridRel.toFixed(2)}`);

  console.log('\n' + '='.repeat(70));
  console.log('测试完成');
  console.log('='.repeat(70));
}

// 评估相关性（基于期望关键词的匹配度）
function evaluateRelevance(results, expectedKeywords) {
  if (results.length === 0) return 0;

  let totalScore = 0;

  results.forEach((result, idx) => {
    const content = result.content.toLowerCase();
    let matchCount = 0;

    expectedKeywords.forEach(keyword => {
      if (content.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    });

    // 位置权重：Top1更重要
    const positionWeight = 1 / (idx + 1);
    const matchRatio = matchCount / expectedKeywords.length;
    totalScore += matchRatio * positionWeight;
  });

  return totalScore;
}

function average(arr) {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行测试
if (require.main === module) {
  runPerformanceTest().catch(console.error);
}

module.exports = { runPerformanceTest };
