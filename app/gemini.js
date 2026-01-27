const logger = console;

const sseStream = async (stream, decoder) => {
  const reader = stream.getReader();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
  }
  return JSON.parse(buffer);
};

const extractText = (node, out = []) => {
  if (node === null) return out;
  // text 以外は model の情報など
  if (typeof node === 'string') {
    return out;
  }
  // 配列なら順番に処理
  if (Array.isArray(node)) {
    for (const item of node) extractText(item, out);
    return out;
  }
  // オブジェクトなら text を拾って再帰を終える
  if (typeof node === 'object') {
    if (typeof node.text === 'string') {
      out.push(node.text);
      return out;
    }
    for (const v of Object.values(node)) {
      extractText(v, out);
    }
  }
  return out;
};

const fetchGemini = async (content, { apiKey, model }) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: content }] },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Gemini API ${res.status} ${res.statusText}`);
  const decoder = new TextDecoder();
  const json = await sseStream(res.body, decoder);
  const parsed = extractText(json);
  return parsed.join('');
};

export const scoreGemini = async (content, { apiKey, model }) => {
  const start = Date.now();
  return fetchGemini(content, { apiKey, model })
  .then(text => {
    const match = text.match(/\{[\s\S]*?\}/);
    const answer = match?.[0] ?? '{}';
    return Promise.resolve()
    .then(() => JSON.parse(answer))
    .catch(e => {
      logger.warn(e, { answer });
      return {};
    });
  })
  .catch(e => logger.warn(e) ?? {})
  .then(answer => ({ ...answer }))
  .then(answer => ({ ...answer, benchmark: `${(Date.now() - start) / 1000}s` }));
};
