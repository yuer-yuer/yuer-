const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractZhipuStreamDelta,
  chunkText,
} = require('../lib/coach-stream');

test('extractZhipuStreamDelta parses content deltas from SSE payloads', () => {
  const raw = [
    'data: {"choices":[{"delta":{"content":"今天"}}]}',
    '',
    'data: {"choices":[{"delta":{"content":"可以"}}]}',
    '',
    'data: [DONE]',
    '',
  ].join('\n');

  assert.deepEqual(extractZhipuStreamDelta(raw), ['今天', '可以']);
});

test('extractZhipuStreamDelta ignores malformed or empty stream lines', () => {
  const raw = [
    ': keep-alive',
    'data: {"choices":[{"delta":{}}]}',
    'data: not-json',
    'data: {"choices":[{"delta":{"content":"稳住"}}]}',
  ].join('\n');

  assert.deepEqual(extractZhipuStreamDelta(raw), ['稳住']);
});

test('chunkText splits local fallback text into stable readable chunks', () => {
  assert.deepEqual(chunkText('小瘦建议你晚餐吃高蛋白和蔬菜', 4), [
    '小瘦建议',
    '你晚餐吃',
    '高蛋白和',
    '蔬菜',
  ]);
});
