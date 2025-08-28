import { servers } from './server.js';

const { LLAMA, DEBUG } = process.env;
const logger = console;

if (DEBUG) logger.info(JSON.stringify(Object.keys(servers)));
const server = servers[LLAMA || 'prod'];

const question = `以下のニュースタイトルが客観的で根拠のある信頼できる報道であるスコアを付けてください。
- 構造（5W1H）が欠落している（無価値）
- コラム・インタビュー・会見（無価値）
- 歴史的な出来事、過去の話題（無価値）
- 未来の予定・構想・計画（無価値）
- 未確認・不確定・可能性・計画中・賛否（無価値）
- 快方・縮小・影響の減少（無価値）
- 否定的な話題、抽象的な話題（無価値）
- 病気、怪我、疾患、患者、治療、入退院（無価値）

回答は JSON 形式で出力してください。
{"newsworthiness":報道価値,"impact":影響力,"influence":["影響範囲"],"negative":ネガティブ,"positive":ポジティブ}
- 報道価値：float 0.0〜5.0 の範囲
- 影響力：float 0.0〜5.0 の範囲
- 影響範囲：最大４つまで 例 建物,森林,海洋,産業,株価,経済,歴史,未来,過去,地球,宇宙,犯罪,政治,芸能,スポーツ,エンタメ,バラエティ,タレント,個人,家族,戦争,遺族
- ネガティブ：float 0.0〜5.0 の範囲
- ポジティブ：float 0.0〜5.0 の範囲
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
    return { ...answer, benchmark: `${(Date.now() - start) / 1000}s` };
  });
};

export default { calcScore };
