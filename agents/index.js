// Agents模块统一导出
const agentGraph = require('./graph');
const classifyIntentNode = require('./nodes/classifier');
const nutritionAgentNode = require('./nodes/nutrition');
const fitnessAgentNode = require('./nodes/fitness');
const generalReplyNode = require('./nodes/general');

module.exports = {
  agentGraph,
  classifyIntentNode,
  nutritionAgentNode,
  fitnessAgentNode,
  generalReplyNode,
};
