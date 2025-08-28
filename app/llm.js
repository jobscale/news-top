import { calcScore } from './credibility.js';
import { calcScore as calc5w1h } from './subjective.js';

const logger = console;
const bewitch = [
  '芸能', 'スポーツ', 'エンタメ', 'タレント', '政治', '選挙',
  '個人', '家族', '犯罪', '過去', '戦争', '遺族', '歴史',
];

export const aiCalc = async title => {
  const ai = {
    ...await calcScore(title).catch(e => logger.warn(e) || {}),
    ...await calc5w1h(title).catch(e => logger.warn(e) || {}),
  };
  const cheat = Math.min(2.5, bewitch.filter(word => ai.influence?.includes(word)).length);
  const sum = { subjective: 0, cheat };
  sum.subjective += 5 - ai.credibility;
  sum.subjective += 5 - ai.importance;
  sum.subjective += 5 - ai.urgency;
  sum.subjective += 5 - ai.novelty;
  sum.subjective /= 4;
  sum.subjective += ai.bias / 2;
  sum.score = Math.max(0, ai.newsworthiness + ai.impact - sum.subjective - sum.cheat);
  return { ...ai, ...sum };
};

export default {
  aiCalc,
};
