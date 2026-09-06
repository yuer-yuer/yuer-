#!/bin/bash
# Multi-Agent系统诊断脚本

echo "=========================================="
echo "Multi-Agent系统诊断"
echo "=========================================="
echo ""

# 1. 测试服务器健康
echo "1. 测试服务器健康..."
curl -s http://localhost:3000/api/health > /dev/null && echo "✅ 服务器运行正常" || echo "❌ 服务器未运行"
echo ""

# 2. 测试智能路由（不指定Agent）
echo "2. 测试智能路由..."
RESULT=$(curl -s -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "蛋白质每天要吃多少", "userId": "test"}')
INTENT=$(echo $RESULT | grep -o '"intent":"[^"]*"' | cut -d'"' -f4)
AGENT=$(echo $RESULT | grep -o '"agent":"[^"]*"' | cut -d'"' -f4)
KNOWLEDGE=$(echo $RESULT | grep -o '"knowledgeUsed":[0-9]*' | cut -d':' -f2)

echo "   意图: $INTENT (应该是 nutrition)"
echo "   Agent: $AGENT (应该是 nutrition_agent)"
echo "   知识条数: $KNOWLEDGE"
echo ""

# 3. 测试强制营养Agent
echo "3. 测试强制营养Agent..."
RESULT=$(curl -s -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好", "userId": "test", "forceAgent": "nutrition_agent"}')
INTENT=$(echo $RESULT | grep -o '"intent":"[^"]*"' | cut -d'"' -f4)
AGENT=$(echo $RESULT | grep -o '"agent":"[^"]*"' | cut -d'"' -f4)

echo "   意图: $INTENT (应该是 nutrition)"
echo "   Agent: $AGENT (应该是 nutrition_agent)"
echo ""

# 4. 测试强制健身Agent
echo "4. 测试强制健身Agent..."
RESULT=$(curl -s -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好", "userId": "test", "forceAgent": "fitness_agent"}')
INTENT=$(echo $RESULT | grep -o '"intent":"[^"]*"' | cut -d'"' -f4)
AGENT=$(echo $RESULT | grep -o '"agent":"[^"]*"' | cut -d'"' -f4)

echo "   意图: $INTENT (应该是 fitness)"
echo "   Agent: $AGENT (应该是 fitness_agent)"
echo ""

# 5. 检查知识库文件
echo "5. 检查知识库文件..."
NUTRITION_COUNT=$(find knowledge/nutrition -name "*.md" 2>/dev/null | wc -l)
FITNESS_COUNT=$(find knowledge/fitness -name "*.md" 2>/dev/null | wc -l)
echo "   营养知识: $NUTRITION_COUNT 个文件"
echo "   健身知识: $FITNESS_COUNT 个文件"
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
