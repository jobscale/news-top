const { fetch } = require('@jobscale/fetch');
const { JSDOM } = require('jsdom');

class App {
  fetch(uri) {
    return fetch.get(uri)
    .then(res => new JSDOM(res.data).window.document)
    .then(document => {
      const list = Array.from(document.querySelectorAll('[aria-label="NEW"]'))
      .map(el => el.parentElement.parentElement.textContent);
      return list;
    });
  }
}

module.exports = {
  App,
  app: new App(),
};
