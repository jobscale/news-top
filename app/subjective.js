import { servers } from './server.js';

const { LLAMA, DEBUG } = process.env;
const logger = console;

if (DEBUG) logger.info(JSON.stringify(Object.keys(servers)));
const server = servers[LLAMA || 'prod'];

const question = `以下のニュースに対して、具体性・正確性を確認します。
5W1H の具体性・正確性を確認する：
- Who（誰が）
- What（何を）
- When（いつ）
- Where（どこで）
- Why（なぜ）
- How（どのように）

回答は JSON 形式で出力してください。
{"credibility":信頼性,"importance":重要性,"urgency":緊急性,"novelty":希少性・異常性・新規性,"bias":偏見・不公平・主観}
- 信頼性：float 0.0〜5.0 の範囲
- 重要性：float 0.0〜5.0 の範囲
- 緊急性：float 0.0〜5.0 の範囲
- 希少性・異常性・新規性：float 0.0〜5.0 の範囲
- 偏見・不公平・主観：float 0.0〜5.0 の範囲 具体性の欠如はスコア 5.0
説明や理由やは不要です。
`;

const llmFetch = async content => {
  const res = await fetch(server.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });
  return res.json();
};

export const calcScore = async title => {
  const start = Date.now();
  const content = `${question}\n\nTitle: ${title}`;
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
    if (DEBUG) logger.info('\n\n', JSON.stringify({ title, message: res.choices[0].message.content }));
    const match = res.choices[0].message.content.match(/\{[\s\S]*?\}/);
    const answer = match ? match[0] : '{}';
    return (async () => JSON.parse(answer))()
    .catch(e => {
      logger.warn(e, { answer });
      return {};
    });
  })
  .catch(e => logger.warn(e) ?? {})
  .then(answer => {
    return { ...answer };
  })
  .then(answer => {
    return { ...answer, benchmark5w1h: `${(Date.now() - start) / 1000}s` };
  });
};

export default { calcScore };
