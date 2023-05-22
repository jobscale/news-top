const { logger } = require('@jobscale/logger');
const { fetch } = require('@jobscale/fetch');
const { app: news } = require('./app');
const { list } = require('./app/list');

const wait = ms => new Promise(resolve => { setTimeout(resolve, ms); });

class App {
  postSlack(data) {
    const url = 'https://tanpo.jsx.jp/api/slack';
    const options = {
      url,
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      data,
    };
    return fetch(options);
  }

  async post(rowsList) {
    const rows = rowsList.flat();
    if (!rows.length) return;
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < rows.length; i++ && await wait(8000)) {
      await this.postSlack({
        channel: 'C4WN3244D',
        icon_emoji: ':rolled_up_newspaper:',
        username: 'News',
        text: rows[i],
      });
    }
  }

  fetch(uri) {
    return news.fetch(uri)
    .then(rows => logger.info(JSON.stringify({ uri, rows })) || rows)
    .catch(e => logger.error({ error: e.massage, status: e.status, uri }) || []);
  }

  async start() {
    const rows = await Promise.all(list.map(uri => this.fetch(uri)));
    return this.post(rows);
  }
}

new App().start()
.catch(e => {
  logger.error(e.message, e);
});
