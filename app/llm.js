import { dataset, logical } from './dataset.js';
import { calcScore } from './credibility.js';

const logger = console;

export const aiCalc = async title => {
  const ai = {
    ...await calcScore(title).catch(e => logger.warn(e) || {}),
  };
  const logic = logical(title);
  const sum = { subjective: 0, cheat: 0 };
  sum.cheat += Math.max(0, logic.mediocre.length - (logic.emergency.length * 2));
  Object.assign(ai, logic);
  sum.cheat += dataset.mediocre.filter(word => ai.influence?.includes(word)).length;
  sum.subjective += 5 - ai.credibility;
  sum.subjective += 5 - ai.importance;
  sum.subjective += 5 - ai.urgency;
  sum.subjective += 5 - ai.novelty;
  sum.subjective /= 4;
  sum.subjective += ai.bias / 2;
  sum.marks = ai.newsworthiness + ai.impact - sum.subjective;
  sum.score = Math.max(0, sum.marks - sum.cheat);
  return { ...ai, ...sum };
};

export default {
  aiCalc,
};
