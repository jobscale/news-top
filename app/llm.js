import { dataset, extractKeywords } from './dataset.js';
import { calcScore } from './credibility.js';

const logger = console;

export const aiCalc = async title => {
  const ai = {
    ...await calcScore(title).catch(e => logger.warn(e) ?? {}),
  };
  const logic = extractKeywords(title);
  const sum = { subjectivity: 0, penalty: 0 };
  sum.penalty += Math.max(0, logic.noisy.length - logic.emergency.length * 2);
  sum.penalty += dataset.noisy.filter(word => ai.influence?.includes(word)).length;
  const inverse = v => (5 - v) / 4;
  sum.subjectivity += inverse(ai.credibility);
  sum.subjectivity += inverse(ai.importance);
  sum.subjectivity += inverse(ai.urgency);
  sum.subjectivity += inverse(ai.novelty);
  sum.subjectivity += ai.bias / 2;
  sum.sensitivity = ai.negative < ai.positive ? ai.positive : ai.negative * -1;
  delete ai.positive;
  delete ai.negative;
  sum.preliminary = ai.newsworthiness + ai.impact - sum.subjectivity;
  sum.score = Math.max(0, sum.preliminary - sum.penalty);
  return { ...ai, ...logic, ...sum };
};

export default {
  aiCalc,
};
