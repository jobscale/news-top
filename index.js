const { logger } = require('@jobscale/logger');
const { fetch } = require('@jobscale/fetch');
const { kabuka } = require('./app');

const list = [
  '8316.T', '2497.T', '6143.T',
];

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

  execute(code) {
    return kabuka.fetch(code)
    .then(payload => this.postSlack(payload));
  }

  wait(ms) {
    const prom = {};
    prom.pending = new Promise((...argv) => { [prom.resolve, prom.reject] = argv; });
    setTimeout(prom.resolve, ms);
    return prom.pending;
  }

  async start() {
    // eslint-disable-next-line no-restricted-syntax
    for (let i = 0; i < list.length;) {
      const code = list[i];
      await this.execute(code);
      // eslint-disable-next-line no-plusplus
      if (++i < list.length) await this.wait(5000);
    }
  }
}

new App().start()
.catch(e => {
  logger.error(e.message, e);
});
