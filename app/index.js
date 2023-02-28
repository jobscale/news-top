const { fetch } = require('@jobscale/fetch');
const { JSDOM } = require('jsdom');

class App {
  fetch(uri) {
    return fetch.get(uri)
    .then(res => new JSDOM(res.data).window.document)
    .then(document => {
      const cardList = document.querySelectorAll('.live-contents .linelayout-card');
      const list = Array.from(cardList)
      .map(v => v.textContent);
      return list;
    });
  }
}

module.exports = {
  App,
  app: new App(),
};
