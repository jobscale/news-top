import { fileURLToPath } from 'url';
import path from 'path';
import { readFile } from 'fs/promises';
import { createLogger } from '@jobscale/logger';
import { aiCalc } from '../app/llm.js';

const filepath = fileURLToPath(import.meta.url);
const dirname = path.dirname(filepath);

const logger = createLogger('info', { noPathName: true, noType: true });

const main = async () => {
  const titleList = await readFile(path.join(dirname, 'news.txt'), 'utf8')
  .then(res => res.split('\n').filter(item => item));
  for (const title of titleList) {
    const ai = await aiCalc(title).catch(e => logger.warn(e) || {});
    logger.info(JSON.stringify({ title, ...ai }));
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
