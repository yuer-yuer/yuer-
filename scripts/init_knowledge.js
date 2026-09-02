// 知识库初始化脚本
require('dotenv').config({ path: '.env.agent' });
const fs = require('fs');
const path = require('path');
const { qdrantService, elasticsearchService, embeddingService } = require('../rag');
const logger = require('../monitoring/logger');

// 检查服务是否就绪
async function checkServices() {
  console.log('检查服务连通性...');

  try {
    // 检查Qdrant
    await qdrantService.ensureCollection();
    console.log('✅ Qdrant已连接');
  } catch (error) {
    console.log('⚠️ Qdrant连接失败，使用本地向量存储');
  }

  try {
    // 检查Elasticsearch
    await elasticsearchService.ensureIndex();
    console.log('✅ Elasticsearch已连接');
  } catch (error) {
    console.log('⚠️ Elasticsearch连接失败，使用内存搜索');
  }

  console.log('✅ 服务检查完成');
}

// 读取知识库文件
function loadKnowledgeFiles() {
  console.log('\n读取知识库文件...');

  const knowledgeDir = path.join(__dirname, '../knowledge');
  const files = [];

  // 读取营养知识库
  const nutritionDir = path.join(knowledgeDir, 'nutrition');
  const nutritionFiles = fs.readdirSync(nutritionDir)
    .filter(f => f.endsWith('.md') && f !== '00_index.md')
    .map(f => ({
      path: path.join(nutritionDir, f),
      category: 'nutrition',
      filename: f,
    }));

  // 读取运动知识库
  const fitnessDir = path.join(knowledgeDir, 'fitness');
  const fitnessFiles = fs.readdirSync(fitnessDir)
    .filter(f => f.endsWith('.md') && f !== '00_index.md')
    .map(f => ({
      path: path.join(fitnessDir, f),
      category: 'fitness',
      filename: f,
    }));

  files.push(...nutritionFiles, ...fitnessFiles);

  console.log(`✅ 找到 ${files.length} 个知识库文件`);
  return files;
}

// 文档分块
function chunkDocument(content, filename, category) {
  // 按双换行符分段落
  const paragraphs = content
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 50); // 过滤太短的段落

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

// 向量化并存储到Qdrant
async function vectorizeAndStore(documents) {
  console.log('\n向量化文档并存储到Qdrant...');

  try {
    // 批量生成Embedding
    const texts = documents.map(doc => doc.content);
    console.log('正在生成Embedding，请稍候...');

    const embeddings = await embeddingService.embedBatch(texts);

    // 准备Qdrant points
    const points = documents.map((doc, idx) => ({
      id: doc.id,
      vector: embeddings[idx],
      metadata: {
        content: doc.content,
        ...doc.metadata,
      },
    }));

    // 存储到Qdrant
    await qdrantService.upsert(points);

    console.log(`✅ 已向量化并存储 ${documents.length} 个文档块`);
    return true;
  } catch (error) {
    console.error('❌ 向量化失败:', error.message);
    logger.error('向量化失败', { error: error.message });
    return false;
  }
}

// 索引到Elasticsearch
async function indexToElasticsearch(documents) {
  console.log('\n索引文档到Elasticsearch...');

  try {
    await elasticsearchService.bulkIndex(documents);
    console.log(`✅ 已索引 ${documents.length} 个文档块到ES`);
    return true;
  } catch (error) {
    console.error('❌ 索引失败:', error.message);
    logger.error('ES索引失败', { error: error.message });
    return false;
  }
}

// 主函数
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('慢慢瘦 - 知识库初始化脚本');
    console.log('='.repeat(60));

    // 1. 检查服务
    await checkServices();

    // 2. 读取知识库文件
    const files = loadKnowledgeFiles();

    // 3. 处理每个文件
    console.log('\n处理知识库文件...');
    let allChunks = [];

    for (const file of files) {
      const content = fs.readFileSync(file.path, 'utf-8');
      const chunks = chunkDocument(content, file.filename, file.category);
      allChunks.push(...chunks);

      console.log(`  ${file.filename}: ${chunks.length} 个块`);
    }

    console.log(`\n✅ 总计 ${allChunks.length} 个文档块`);

    // 4. 向量化并存储到Qdrant
    const vectorizeSuccess = await vectorizeAndStore(allChunks);

    // 5. 索引到Elasticsearch
    const indexSuccess = await indexToElasticsearch(allChunks);

    // 6. 总结
    console.log('\n' + '='.repeat(60));
    if (vectorizeSuccess && indexSuccess) {
      console.log('✅ 知识库初始化完成！');
    } else {
      console.log('⚠️ 知识库初始化部分完成（部分服务不可用）');
    }
    console.log('='.repeat(60));

    console.log('\n统计信息：');
    console.log(`  - 文档数量: ${files.length}`);
    console.log(`  - 文档块数量: ${allChunks.length}`);
    console.log(`  - 营养知识: ${allChunks.filter(c => c.metadata.category === 'nutrition').length} 块`);
    console.log(`  - 运动知识: ${allChunks.filter(c => c.metadata.category === 'fitness').length} 块`);

  } catch (error) {
    console.error('\n❌ 初始化失败:', error.message);
    logger.error('知识库初始化失败', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { main };
