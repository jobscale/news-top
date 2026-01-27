import { servers } from './server.js';

const { LLAMA, DEBUG } = process.env;
const logger = console;

if (DEBUG) logger.info(JSON.stringify(Object.keys(servers)));
const server = servers[LLAMA || 'dark-gemma-it'];

const llmFetch = async content => {
  const res = await fetch(server.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });
  return res.json();
};

export const calcScore = async content => {
  const start = Date.now();
  return llmFetch({
    model: server.model,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: content },
      ],
    }],
    temperature: 0.4,
    max_tokens: 256,
  })
  .then(res => {
    if (DEBUG) logger.info('\n\n', JSON.stringify({ message: res.choices[0].message.content }));
    const match = res.choices[0].message.content.match(/\{[\s\S]*?\}/);
    const answer = match?.[0] ?? '{}';
    return (async () => JSON.parse(answer))()
    .catch(e => {
      logger.warn(e, { answer });
      return {};
    });
  })
  .catch(e => logger.warn(e) ?? {})
  .then(answer => ({ ...answer }))
  .then(answer => ({ ...answer, benchmark: `${(Date.now() - start) / 1000}s` }));
};

export default { calcScore };
