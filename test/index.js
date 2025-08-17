import { fileURLToPath } from 'url';
import path from 'path';
import { readFile } from 'fs/promises';
import { calcScore } from '../app/llm.js';
import { calcScore as calc5w1h } from '../app/llm-ex.js';

const filepath = fileURLToPath(import.meta.url);
const dirname = path.dirname(filepath);

const logger = console;

const main = async () => {
  const titleList = await readFile(path.join(dirname, 'news.txt'), 'utf8')
  .then(res => res.split('\n').filter(item => item));
  for (const title of titleList) {
    const res = await calcScore(title);
    const res5w1h = await calc5w1h(title);
    logger.info(JSON.stringify({ title, ...res, ...res5w1h }));
  }
};

process.on('uncaughtException', e => {
  logger.error('Uncaught Exception', { e: e.toString() });
  process.exit(1);
});

process.on('unhandledRejection', reason => {
  logger.error('Unhandled Rejection', { reason: reason.toString() });
  process.exit(1);
});

main();
