import { Logger } from '@jobscale/logger';
import './env.js';
import { app as news } from './app/index.js';
import { timeSignal } from './app/time-signal.js';

const logger = new Logger({ timestamp: true });
const wait = ms => new Promise(resolve => { setTimeout(resolve, ms); });

class App {
  postSlack(body) {
    const url = 'https://jsx.jp/api/slack';
    const options = {
      url,
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    };
    return fetch(url, options);
  }

  async post(rowsList, username = 'News') {
    const rows = rowsList.flat();
    if (!rows.length) return;
    const opts = {};
    for (const row of rows) {
      if (!opts.first) opts.first = true;
      else await wait(8000);
      const block = {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: row.block },
        ],
      };
      await this.postSlack({
        channel: '#random',
        icon_emoji: ':rolled_up_newspaper:',
        username,
        text: row.text,
        blocks: [block],
      });
    }
  }

  async news() {
    const rows = [];
    rows.push(...await news.rss().catch(e => { logger.error(e); return []; }));
    rows.push(...await news.asahi().catch(e => { logger.error(e); return []; }));
    rows.push(...await news.nikkei().catch(e => { logger.error(e); return []; }));
    rows.push(...await news.yahoo().catch(e => { logger.error(e); return []; }));
    if (!rows.length) return;
    await this.post(rows);
  }

  async start() {
    await this.news();
    await timeSignal.startTimeSignal();
  }
}

new App().start()
.catch(e => logger.error(e));
