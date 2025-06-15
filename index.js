import dayjs from 'dayjs';
import { Logger } from '@jobscale/logger';
import { app as news } from './app/index.js';
import { list, amz } from './app/list.js';

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

  async post(rowsList) {
    const rows = rowsList.flat();
    if (!rows.length) return;
    const opts = {};
    for (const row of rows) {
      if (!opts.first) opts.first = true;
      else await wait(10000);
      await this.postSlack({
        channel: '#random',
        icon_emoji: ':rolled_up_newspaper:',
        username: 'News',
        text: row,
      });
    }
  }

  fetch(uri, ts) {
    return news.fetch(uri)
    .then(rows => logger.info(JSON.stringify({ ts, uri, rows })) || rows)
    .catch(e => logger.error({ e, uri }) || []);
  }

  async amz(ts) {
    return news.amz(amz, ts)
    .then(priseList => {
      logger.info(ts, JSON.stringify(priseList, null, 2));
      if (!priseList.length) return undefined;
      const text = priseList.join('\n');
      return this.post([text]);
    })
    .catch(e => logger.error(e));
  }

  async start() {
    const [, time] = dayjs().add(9, 'hour').toISOString().split('T');
    const [hh, mm] = time.split(':');
    const ts = `${hh}:${mm}`;
    const rows = [];
    for (const uri of list) {
      const items = await this.fetch(uri, ts);
      if (items.length) {
        rows.push(...items);
        break;
      }
    }
    await this.post(rows);
    if (ts >= '12:00' && ts <= '12:10') {
      await this.amz(ts);
      return;
    }
    if (rows.length) return;
    if (ts >= '21:00' || ts < '08:00') return;
    await this.amz(ts);
  }
}

new App().start()
.catch(e => logger.error(e));
