const logger = console;

const question = `次のニュースタイトルを「社会的な重要性」「具体性」「公共への影響度」を考慮して、重要度のスコアを 1〜20 の正の整数で評価してください。

- スコア1は、重要性が非常に低い場合です。
- 以下に該当するものは重要度を低くしてください：
  - 意味が不明なもの
  - 固有名詞が不明なもの
  - 個人的な見解・心情のみの話題
  - 人名、地名が不明なもの
  - 場所や地域が不明なもの
  - 既知の社会問題
  - 進展がないもの
  - 不確定・不確実なもの
  - スポーツ関連
  - 芸能関連
  - 冠婚葬祭関連
  - 緊急性が低い話題
  - 放置していた空きビルが崩壊した
- 以下に該当するものは重要度を高くしてください：
  - 多くの人が速やかに対処する必要がある緊急速報
  - 世界規模なインフラ障害、ネットワーク障害
  - 金融の混乱、投信の過剰な動向
  - 気候変動による地球規模の問題
- 特に重要な出来事はスコア 20 にしてください。
- 回答は {"score":数値} の形式で、スコアのみ出力してください。
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
  const content = `${question}\n\nTitle: ${title}`;
  return llmFetch({
    model: 'gemma-3-4b-it',
    messages: [
      { role: 'user', content },
    ],
    temperature: 0.6,
    max_tokens: 128,
  })
  .then(res => {
    const answer = JSON.parse((res?.choices ?? [])[0]?.message?.content ?? '{"ok":false}');
    logger.info(JSON.stringify({ title, answer }));
    return answer;
  })
  .catch(e => logger.warn(e) ?? {});
};

export default { calcScore };
