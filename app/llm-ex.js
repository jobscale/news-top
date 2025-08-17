import { servers } from './server.js';

const { LLAMA, DEBUG } = process.env;
const logger = console;

if (DEBUG) logger.info(JSON.stringify(Object.keys(servers)));
const server = servers[LLAMA || 'prod'];

const question = `以下のニュースに対して、具体性を確認します。
正確性を確認したいので連想しないでください。
5W1H の具体性を確認する：
- Who（誰が）
- What（何を）
- When（いつ）
- Where（どこで）
- Why（なぜ）
- How（どのように）

回答は JSON 形式で出力してください。
{"who":[ワード],"what":[ワード],"when":[ワード],"where":[ワード],"why":[ワード],"how":[ワード],"importance":重要性,"urgency":緊急性,"novelty":新規性,"bias":偏見・不公平・個人や団体の意見}
- ワード：確認した単語
- 重要性：float 0.0 〜 5.0 の範囲 地球崩壊、インフラの崩壊はスコア 5.0
- 緊急性：float 0.0 〜 5.0 の範囲 数時間以内に解決する必要性はスコア 5.0
- 新規性：float 0.0 〜 5.0 の範囲 レアリティ、史上初はスコア 5.0
- 偏見・不公平・個人や団体の意見：float 0.0 〜 5.0 の範囲 個人的な見解や感情はスコア 5.0
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
    messages: [{ role: 'user', content }],
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
    const seen = new Set();
    Object.keys(answer).reverse().forEach(key => {
      if (!Array.isArray(answer[key])) return;
      answer[key] = answer[key].filter(item => {
        if (!item) return false;
        const isSeen = seen.has(item);
        if (isSeen) return false;
        seen.add(item);
        if (!title.includes(item)) {
          logger.error([item], key, JSON.stringify({ title, ...answer }));
          return false;
        }
        return true;
      });
    });
    if (answer.how.length) {
      logger.error(answer.how, 'how', JSON.stringify({ title, ...answer }));
      answer.how = [];
    }

    const summary5w1h = Object.values(answer).reduce((prev, value) => {
      if (!Array.isArray(value)) return prev;
      return prev + (value.length && 1);
    }, 0);
    return {
      ...answer,
      summary5w1h,
    };
  })
  .then(answer => {
    return { ...answer, benchmark5w1h: `${(Date.now() - start) / 1000}s` };
  });
};

export default { calcScore };
