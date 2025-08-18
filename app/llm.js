import { calcScore } from './credibility.js';
import { calcScore as calc5w1h } from './subjective.js';

const logger = console;

export const aiCalc = async title => {
  const ai = {
    ...await calcScore(title).catch(e => logger.warn(e) || {}),
    ...await calc5w1h(title).catch(e => logger.warn(e) || {}),
  };
  ai.score = Math.max(0, (ai.credibility - ai.cheat - ai.subjective) * 2);
  return ai;
};

export default {
  aiCalc,
};
