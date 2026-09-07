/**
 * General SubGraph - 通用对话Agent
 */

const { StateGraph, END } = require('@langchain/langgraph');
const axios = require('axios');
const logger = require('../../../../utils/logger');

// SubGraph状态定义
const GeneralSubState = {
  input: null,
  response: null,
  error: null
};

/**
 * 通用对话节点 - 处理闲聊和兜底场景
 */
async function general_chat_node(state) {
  try {
    const { userQuery, sharedContext } = state.input;

    logger.info('General Agent: 开始处理', { userQuery });

    // 构建System Prompt
    const systemPrompt = `你是"慢慢瘦"AI私教团队的助手"小瘦"。

你的团队包括：
- 小营（营养师）：负责饮食、热量、营养相关问题
- 小练（健身教练）：负责运动、训练、健身计划相关问题

当用户的问题不明确或闲聊时，你需要：
1. 友好地和用户打招呼
2. 了解用户的具体需求（减脂目标、饮食还是运动问题）
3. 引导用户提供更多信息
4. 如果是闲聊，简短回复并引导回到减脂话题

回复要简短、友好、有亲和力😊`;

    // 调用 GLM-4-Flash
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model: process.env.ZHIPU_CHAT_MODEL || 'glm-4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const reply = response.data.choices[0].message.content;

    logger.info('General Agent: 完成', { reply: reply.slice(0, 100) });

    return {
      response: reply,
      error: null
    };
  } catch (error) {
    logger.error('General Agent失败', { error: error.message });

    // 兜底回复
    return {
      response: '你好！我是慢慢瘦AI私教小瘦😊\n\n你可以问我：\n- 饮食相关：热量、食物、营养素配比\n- 运动相关：训练计划、动作指导、减脂方法\n\n有什么可以帮你的吗？',
      error: error.message
    };
  }
}

/**
 * 创建General SubGraph
 */
function createGeneralSubGraph() {
  const workflow = new StateGraph(GeneralSubState);

  // 添加节点
  workflow.addNode('general_chat', general_chat_node);

  // 设置入口
  workflow.setEntryPoint('general_chat');

  // 直接结束
  workflow.addEdge('general_chat', END);

  return workflow.compile();
}

module.exports = { createGeneralSubGraph };
