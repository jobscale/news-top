const { logger } = require('@jobscale/logger');
const { app: news } = require('./app');
const { list } = require('./app/list');

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
    // eslint-disable-next-line no-restricted-syntax
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

  fetch(uri) {
    return news.fetch(uri)
    .then(rows => logger.info(JSON.stringify({ uri, rows })) || rows)
    .catch(e => logger.error({ e, uri }) || []);
  }

  async start() {
    const rows = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const uri of list) {
      rows.push(await this.fetch(uri));
    }
    return this.post(rows);
  }
}

new App().start()
.catch(e => logger.error(e));
