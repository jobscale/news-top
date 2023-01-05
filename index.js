const { logger } = require('@jobscale/logger');
const { fetch } = require('@jobscale/fetch');
const { kabuka } = require('./app');

const list = [
  ['8316.T', '2497.T', '6143.T', '9432.T'],
  ['7951.T', '7012.T', '9399.T', '4751.T'],
  ['8035.T', '4502.T', '8802.T', '8002.T'],
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
    .then(text => {
      this.postSlack({
        channel: 'C4WN3244D',
        icon_emoji: ':moneybag:',
        username: 'Kabuka',
        text: text.join('\n'),
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
