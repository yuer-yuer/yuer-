function extractZhipuStreamDelta(raw) {
  return String(raw || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trim())
    .filter(payload => payload && payload !== '[DONE]')
    .flatMap(payload => {
      try {
        const data = JSON.parse(payload);
        const content = data.choices?.[0]?.delta?.content || data.choices?.[0]?.message?.content;
        return content ? [String(content)] : [];
      } catch {
        return [];
      }
    });
}

function chunkText(text, size = 8) {
  const chars = Array.from(String(text || ''));
  const chunks = [];
  const chunkSize = Math.max(1, Number(size) || 8);
  for (let i = 0; i < chars.length; i += chunkSize) {
    chunks.push(chars.slice(i, i + chunkSize).join(''));
  }
  return chunks;
}

module.exports = {
  chunkText,
  extractZhipuStreamDelta,
};
