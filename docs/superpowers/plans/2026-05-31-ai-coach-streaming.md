# AI Coach Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI coach replies appear incrementally instead of waiting for a full JSON response.

**Architecture:** Keep the existing JSON endpoint behavior for compatibility, and add streaming behavior when the client sends `?stream=1`. The server streams text chunks from the AI provider when configured, or simulates chunked local replies for mock/local fallback. The frontend creates an assistant message immediately and appends received text chunks into that message.

**Tech Stack:** Node.js, Express, browser `fetch()` readable streams, Node test runner.

---

### Task 1: Server Stream Helpers

**Files:**
- Modify: `server.js`
- Test: `tests/coach-stream.test.js`

- [ ] Add tests for parsing provider stream chunks and writing local text chunks.
- [ ] Run `node --test tests/coach-stream.test.js` and confirm the tests fail before implementation.
- [ ] Add small server helpers: `extractZhipuStreamDelta`, `writeCoachStreamChunk`, and `streamLocalCoachReply`.
- [ ] Export helpers only in test mode.
- [ ] Run the focused test and confirm it passes.

### Task 2: Streaming Coach Endpoint

**Files:**
- Modify: `server.js`

- [ ] In `/api/ai/coach-chat`, detect `req.query.stream === '1'`.
- [ ] For stream requests, send `text/plain; charset=utf-8` chunks.
- [ ] Use real provider streaming with `stream: true` when API credentials exist.
- [ ] Fall back to local chunk streaming on mock, missing API key, or provider error.
- [ ] Preserve the old JSON response for non-stream callers.

### Task 3: Frontend Stream Reader

**Files:**
- Modify: `public/js/app.js`

- [ ] Add `streamAiCoachReply` that posts to `/api/ai/coach-chat?stream=1`.
- [ ] In `sendAiCoachMessage`, add an empty assistant message before reading the stream.
- [ ] Append each decoded chunk to that assistant message and rerender.
- [ ] If streaming fails before any content arrives, show the existing friendly fallback message.
- [ ] Save messages and update quick prompts after the stream finishes.

### Task 4: Verification

**Files:**
- Use existing test suite.

- [ ] Run `node --test tests/coach-stream.test.js`.
- [ ] Run `node --test tests/*.test.js`.
- [ ] Inspect the changed diff to ensure only the coach streaming path changed.
