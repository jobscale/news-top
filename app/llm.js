import { db } from './db.js';
import { dataset, extractKeywords } from './dataset.js';
import { calcScore } from './credibility.js';
import { scoreGemini } from './gemini.js';

const useGemini = process.env.USE_GEMINI;

const MODEL = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-exp',
][1];

const data = [
  { property: '"newsworthiness":報道価値', detail: '報道価値：float 0.0〜5.0 の範囲', priority: 5 },
  { property: '"impact":影響力', detail: '影響力：float 0.0〜5.0 の範囲', priority: 5 },
  { property: '"importance":重要性', detail: '重要性：float 0.0〜5.0 の範囲', priority: 5 },
  { property: '"urgency":緊急性', detail: '緊急性：float 0.0〜5.0 の範囲', priority: 5 },
  { property: '"certainty":確定性', detail: '確定性：float 0.0〜5.0 の範囲', priority: 5 },
  { property: '"novelty":希少性・異常性・新規性', detail: '希少性・異常性・新規性：float 0.0〜5.0 の範囲', priority: 5 },
  { property: '"bias":偏見・不公平・主観', detail: '偏見・不公平・主観：float 0.0〜5.0 の範囲 具体性の欠如はスコア 5.0', priority: 5 },
  { property: '"personal":個人的な事象・意見・感想', detail: '個人的な事象・意見・感想：float 0.0〜5.0 の範囲 個人的な内容はスコア 5.0', priority: 5 },
  { property: '"category":[]', detail: 'カテゴリ：文字列の配列', priority: 5 },
  { property: '"location":[]', detail: '地理的な情報：文字列の配列', priority: 5 },
  { property: '"influence":[]', detail: '影響範囲：文字列の配列', priority: 3 },
  { property: '"negative":ネガティブ', detail: 'ネガティブ：float 0.0〜5.0 の範囲', priority: 1 },
  { property: '"positive":ポジティブ', detail: 'ポジティブ：float 0.0〜5.0 の範囲', priority: 1 },
];
const useData = data.filter(d => d.priority >= 5);

const question = `以下のニュースタイトルが客観的で根拠のある信頼できる報道であるスコアを付けてください。

回答は JSON 形式で出力してください。
{
${useData.map(d => `${d.property}`).join(',\n')}
}
${useData.map(d => `${d.detail}`).join('\n')}
説明や理由やは不要です。
`;

const adjuster = item => {
  const isNumber = v => Number.parseFloat(v) === v * 1;
  const scaler = v => Math.min(5, Math.max(0, v - 2) * 5 / 3);
  Object.keys(item).filter(key => isNumber(item[key]))
  .forEach(key => { item[key] = scaler(item[key]); });
  return item;
};

const normalize = item => {
  const isNumber = v => Number.parseFloat(v) === v * 1;
  const toFixed = v => Number.parseFloat(v.toFixed(2), 10);
  Object.keys(item).filter(key => isNumber(item[key]))
  .forEach(key => { item[key] = toFixed(item[key]); });
  return item;
};

const store = {};
export const aiCalc = async title => {
  const content = `${question}\n\nTitle: ${title}`;
  const ai = {};
  if (useGemini) {
    if (!store.credentials) {
      const apiKey = await db.getValue('config/geminiApiKey', 'apiKey');
      store.credentials = { apiKey, model: MODEL };
    }
    Object.assign(ai, await scoreGemini(content, store.credentials), { model: 'gemini' });
  }
  if (!ai.newsworthiness && ai.newsworthiness !== 0) {
    Object.assign(ai, await calcScore(content), { model: 'llama' });
  }
  adjuster(ai);
  const logic = extractKeywords(title);
  const sum = { careful: 0, subjectivity: 0, penalty: 0 };
  sum.careful += ai.newsworthiness + ai.impact;
  sum.careful += ai.importance;
  sum.penalty += ai.personal ?? 0;
  sum.penalty += dataset.noisy.filter(word => ai.location?.includes(word)).length;
  sum.penalty += dataset.noisy.filter(word => ai.category?.includes(word)).length;
  sum.penalty += dataset.noisy.filter(word => ai.influence?.includes(word)).length;
  sum.penalty += logic.noisy.length;
  sum.penalty -= logic.emergency.length * 1.5;
  sum.subjectivity += (5 - ai.urgency) * 0.7;
  sum.subjectivity += (5 - ai.certainty) * 0.4;
  sum.subjectivity += (5 - ai.novelty) * 0.3;
  sum.subjectivity += ai.bias * 0.5;
  if (ai.positive && ai.negative) {
    sum.sensitivity = ai.positive - ai.negative;
    delete ai.positive;
    delete ai.negative;
  }
  sum.score = Math.max(0, sum.careful - sum.subjectivity - sum.penalty);
  if (!sum.score && sum.score !== 0) {
    sum.score = Math.max(0, 3 - logic.noisy.length + logic.emergency.length * 1.5);
  }
  return normalize({
    ...ai, ...logic, ...sum,
  });
};

export default {
  aiCalc,
};
