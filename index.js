const { logger } = require('@jobscale/logger');
const { fetch } = require('@jobscale/fetch');
const { app: news } = require('./app');
const { list } = require('./app/list');

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
    .then(rows => {
      const text = rows.join('\n\n');
      logger.info(text);
      this.postSlack({
        channel: 'C4WN3244D',
        icon_emoji: ':moneybag:',
        username: 'News',
        text,
      });
    });
  }

  wait(ms) {
    const prom = {};
    prom.pending = new Promise((...argv) => { [prom.resolve, prom.reject] = argv; });
    setTimeout(prom.resolve, ms);
    return prom.pending;
  }

  async start() {
    for (let i = 0; i < list.length;) {
      const uri = list[i];
      await this.execute(uri);
      if (++i < list.length) await this.wait(5000); // eslint-disable-line no-plusplus
    }
  }
}

new App().start()
.catch(e => {
  logger.error(e.message, e);
});
