import { servers } from './server.js';

const { LLAMA, DEBUG } = process.env;
const logger = console;

if (DEBUG) logger.info(JSON.stringify(Object.keys(servers)));
const server = servers[LLAMA || 'prod'];

const question = `以下のニュースに対して、影響度に応じて1〜10のスコアを付けてください。
[基本]スコアは以下の基準に従ってください：
- 1〜2：芸能・スポーツ・エンタメ・政治・個人・犯罪・受刑者・遺族・冠婚葬祭
- 3〜4：事件・事故・地域災害
- 5〜6：経済・社会・文化
- 7〜8：世界規模・国内全域規模のインフラ障害、セキュリティ・サイバー攻撃
- 9〜10：世界規模の事件・事故・経済・文明的影響

[調整]以下のような内容はスコアを下げてください：
- 歴史的な出来事、過去の話題は低評価（スコア1〜2）
- 未来の予定・構想・計画は低評価（スコア1 〜 -2）
- 未確認・不確定・可能性・計画中・賛否は低評価（スコア1〜2）
- 快方・縮小・影響の減少は低評価（スコア1〜2）
- 否定的な話題、抽象的な話題は低評価（スコア1〜2）
- 病気、怪我、疾患、患者、治療、入退院は低評価（スコア1〜2）
- 気候や災害による経済・産業への重大な影響（スコア9〜10）

回答は JSON 形式で出力してください。
{"score":スコア,"location":["地理的影響範囲"],"influence":["影響範囲"],"sentimental":感情値}
- スコア：正の整数 1〜10
- 地理的影響範囲の例：北米|北東アジア|国内|中東|北欧|ヨーロッパ|ニューヨーク|オタワ|ヘルシンキ|大阪市|渋谷区|東京都|大阪府|北欧|地域|個人
- 影響範囲の例：生命|怪我|疾患|患者|建物|産業|株価|経済|歴史|未来|地球|快方|好転|縮小|犯罪|芸能|スポーツ|エンタメ|政治|個人
- 感情値：float でポジティブ 2 、ネガティブ -2 の範囲
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
    max_tokens: 64,
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
    const lowWord = ['芸能', 'スポーツ', 'エンタメ', '政治', '個人', '犯罪', '快方', '好転', '縮小'];
    const minus = (
      lowWord.find(word => answer.location?.includes(word))
    || lowWord.find(word => answer.influence?.includes(word))
    ) ? 5 : 0;
    return {
      ...answer,
      summary: Math.max(1, answer.score - minus),
    };
  })
  .then(answer => {
    return { ...answer, benchmark: `${(Date.now() - start) / 1000}s` };
  });
};

export default { calcScore };
