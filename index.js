import dayjs from 'dayjs';
import { Logger } from '@jobscale/logger';
import './env.js';
import { app as news } from './app/index.js';
import { list, amz } from './app/list.js';
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
      await this.postSlack({
        channel: '#random',
        icon_emoji: ':rolled_up_newspaper:',
        username,
        text: row,
      });
    }
  }

  async amz(ts) {
    return news.amz(amz, ts)
    .then(priseList => {
      logger.info(ts, JSON.stringify(priseList, null, 2));
      if (!priseList.length) return undefined;
      const text = priseList.join('\n');
      return this.post([text], 'EC');
    })
    .catch(e => logger.error(e));
  }

  async news() {
    const rows = [];
    for (const uri of list) {
      const items = await news.yahoo(uri).catch(e => logger.error(e) || []);
      if (items.length) rows.push(...items);
    }
    const items = await news.asahi().catch(e => logger.error(e) || []);
    if (items.length) rows.push(...items);
    return rows;
  }

  async start() {
    const [, time] = dayjs().add(9, 'hour').toISOString().split('T');
    const [hh, mm] = time.split(':');
    const ts = `${hh}:${mm}`;
    const rows = [];
    for (let i = 0; i < 3; i++) {
      const items = await this.news();
      if (items.length) rows.push(...items);
      else break;
    }
    if (rows.length) await this.post(rows);
    if (ts >= '10:50' && ts <= '11:10') {
      await this.amz(ts);
    }
    await timeSignal.startTimeSignal();
  }
}

new App().start()
.catch(e => logger.error(e));
