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
    .then(rows => {
      const text = rows.join('\n\n');
      logger.info(text);
      this.postSlack({
        channel: 'C4WN3244D',
        icon_emoji: ':rolled_up_newspaper:',
        username: 'News',
        text,
      });
    });
  }

  async start() {
    for (let i = 0; i < list.length;) {
      const uri = list[i];
      await this.execute(uri);
      if (++i < list.length) await wait(10000); // eslint-disable-line no-plusplus
    }
  }
}

new App().start()
.catch(e => {
  logger.error(e.message, e);
});
