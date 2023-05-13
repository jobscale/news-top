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

  execute(uri) {
    return news.fetch(uri)
    .then(async rows => {
      logger.info(JSON.stringify({ uri, rows }));
      if (!rows.length) return;
      for (let i = 0; rows.length;) {
        await this.postSlack({
          channel: 'C4WN3244D',
          icon_emoji: ':rolled_up_newspaper:',
          username: 'News',
          text: rows[i],
        });
        if (++i < list.length) await wait(8000); // eslint-disable-line no-plusplus
      }
    })
    .catch(e => logger.error({ error: e.massage, status: e.status, uri }));
  }

  async start() {
    for (let i = 0; i < list.length;) {
      const uri = list[i];
      await this.execute(uri);
      if (++i < list.length) await wait(7000); // eslint-disable-line no-plusplus
    }
  }
}

new App().start()
.catch(e => {
  logger.error(e.message, e);
});
