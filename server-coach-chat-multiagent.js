// Multi-Agent版本的AI私教接口
// 替换 server.js 中 1043-1104 行的 /api/ai/coach-chat 接口

app.post('/api/ai/coach-chat', requireAuth, async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json(err(400, '请输入要和小瘦说的话'));
  if (message.length > 800) return res.status(400).json(err(400, '消息太长了，精简一点再发给小瘦吧'));

  const snapshot = buildCoachSnapshotForUser(req.session.userId);
  const local = buildLocalCoachReply(message, snapshot).content;

  // 使用Multi-Agent系统
  try {
    const { sessionId, forceAgent } = req.body;

    // 获取或创建会话
    let activeSessionId = sessionId;
    if (sessionId) {
      const session = sessionManager.getSession(sessionId);
      if (!session) {
        const newSession = sessionManager.createSession(req.session.userId);
        activeSessionId = newSession.sessionId;
      }
    } else {
      const newSession = sessionManager.createSession(req.session.userId);
      activeSessionId = newSession.sessionId;
    }

    // 添加用户消息到会话
    sessionManager.addMessage(activeSessionId, 'user', message);

    // 调用Multi-Agent Graph
    const result = await agentGraph.invoke({
      message,
      userId: req.session.userId,
      sessionId: activeSessionId,
      forceAgent: forceAgent || null, // 支持强制指定Agent
    });

    // 添加AI回复到会话
    sessionManager.addMessage(activeSessionId, 'assistant', result.reply, {
      intent: result.intent,
      agent: result.agent,
    });

    // 返回Multi-Agent结果
    return res.json(ok({
      reply: result.reply,
      intent: result.intent,
      agent: result.agent,
      knowledgeUsed: result.knowledgeUsed,
      sessionId: activeSessionId,
      provider: 'multi-agent',
      quickPrompts: getCoachQuickPrompts({ ...snapshot, history: [] }),
    }));
  } catch (e) {
    console.error('Multi-Agent chat failed:', e);
    // 降级到本地回复
    return res.json(ok({
      reply: `${local}\n\n（小瘦刚才网络开小差了，先按你的本地数据给建议。）`,
      provider: 'local-fallback',
      quickPrompts: getCoachQuickPrompts({ ...snapshot, history: [] }),
    }));
  }
});
