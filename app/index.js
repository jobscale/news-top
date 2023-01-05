const { fetch } = require('@jobscale/fetch');
const { JSDOM } = require('jsdom');

const url = 'https://finance.yahoo.co.jp/quote/{{code}}';

class Kabuka {
  fetch(code) {
    if (Array.isArray()) return Promise.all(code.map(c => this.fetch(c)));
    const uri = url.replace(/{{code}}/, code);
    return fetch.get(uri)
    .then(res => new JSDOM(res.data).window.document)
    .then(document => {
      const main = document.querySelector('#root > main > div > div > div');
      const section = main.querySelector('div:nth-child(3)');
      // const body = section.querySelector('#detail');
      const header = section.querySelector('section > div:nth-child(2)');
      const name = header.querySelector('div:nth-child(1)').textContent;
      const value = header.querySelector('div:nth-child(2)').textContent;
      return `${value} - <${uri}|${name} (${code})>`;
    });
  }
}

module.exports = {
  Kabuka,
  kabuka: new Kabuka(),
};
