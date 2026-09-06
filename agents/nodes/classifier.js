// Agent节点：意图分类
const logger = require('../../monitoring/logger');
const agentConfig = require('../../config/agent.config');

/**
 * 意图分类节点
 * 根据用户输入判断应该路由到哪个Agent
 */
async function classifyIntentNode(state) {
  const { messages } = state;
  const userMessage = messages[messages.length - 1].content;

  logger.info('意图分类开始', { message: userMessage });

  // 简单的关键词匹配分类（后续可以升级为LLM分类）
  const intent = classifyIntent(userMessage);

  logger.info('意图分类完成', { intent });

  return {
    ...state,
    intent,
  };
}

/**
 * 关键词匹配分类
 */
function classifyIntent(message) {
  const lowerMessage = message.toLowerCase();

  // 营养相关关键词
  const nutritionKeywords = [
    '吃', '食物', '热量', '卡路里', '营养', '蛋白质', '碳水', '脂肪',
    '饮食', '食谱', '餐', '饿', '减肥餐', '生酮', '断食',
    '苹果', '鸡蛋', '鸡胸肉', '蔬菜', '水果', '主食', '零食',
    '早餐', '午餐', '晚餐', '加餐', '宵夜',
  ];

  // 运动相关关键词
  const fitnessKeywords = [
    '运动', '锻炼', '训练', '健身', '跑步', '跳绳', '游泳', '骑行',
    'hiit', '有氧', '力量', '深蹲', '俯卧撑', '引体', '卷腹',
    '肌肉', '增肌', '塑形', '马甲线', '翘臀',
    '计划', '方案', '动作', '组数', '次数',
    '累', '酸痛', '拉伸', '恢复', '休息',
  ];

  // 统计匹配数
  let nutritionScore = 0;
  let fitnessScore = 0;

  for (const keyword of nutritionKeywords) {
    if (lowerMessage.includes(keyword)) {
      nutritionScore++;
    }
  }

  for (const keyword of fitnessKeywords) {
    if (lowerMessage.includes(keyword)) {
      fitnessScore++;
    }
  }

  // 判断意图
  if (nutritionScore > fitnessScore && nutritionScore > 0) {
    return 'nutrition';
  } else if (fitnessScore > nutritionScore && fitnessScore > 0) {
    return 'fitness';
  } else if (nutritionScore === fitnessScore && nutritionScore > 0) {
    // 同时涉及营养和运动，优先营养（因为饮食更重要）
    return 'nutrition';
  } else {
    // 无法明确分类，使用通用回复
    return 'general';
  }
}

module.exports = classifyIntentNode;
