const logger = console;

const question = `次のニュースタイトルを「社会的な重要性」「具体性」「公共への影響度」を考慮して、重要度のスコアを 1〜20 の正の整数で評価してください。

- スコア 1 は重要性が非常に低い場合です。
- 以下に該当するものは重要度・低：
  - 具体性が無いもの
  - 人名、地名が不明なもの
  - 場所や地域が不明なもの
  - 固有名詞が不明なもの
  - 意味が不明なもの
  - 不確定・不確実なもの
  - 個人的な見解・心情のみの話題
  - 既知の社会問題
  - スポーツ、芸能、政治関連
  - 冠婚葬祭関連
  - 東京や関東、東北に関する情報
  - 快方に向かっている情報
  - 調整中の情報
  - 異議、異論、反論、撤回、賛成など進展がないもの
  - 悲しいとか驚いたなどの主観
- 以下に該当するものは重要度・高：
  - 世界規模なインフラ障害、ネットワーク障害
  - 気候変動による地球規模の問題
  - 大阪や関西に関する情報（スポーツ関連や政治関連は除く）
- 特に重要な出来事はスコア 20 にしてください。
- 回答は {"score":数値} のJSON形式で出力し、コードブロックや Markdown にしないでください。
- 説明や理由は不要です。
`;

const llmFetch = async content => {
  const res = await fetch('https://llama.x.jsx.jp/v1/chat/completions', {
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
    model: 'gemma-3-4b-it',
    messages: [{ role: 'user', content }],
    temperature: 0.6,
    max_tokens: 64,
  })
  .then(res => {
    const answer = res.choices[0].message.content;
    logger.info(JSON.stringify({ title, answer }));
    return JSON.parse(answer);
  })
  .catch(e => logger.warn(e) ?? {})
  .then(answer => {
    return { ...answer, benchmark: (Date.now() - start) / 1000 };
  });
};

export default { calcScore };
