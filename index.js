require('core');
const weather = require('weather-js');
const { JSDOM } = require('jsdom');

class Weather {
  run() {
    const url = 'https://tenki.jp/forecast/6/30/6200/27100/';
    return fetch(url)
    .then(res => res.text())
    .then(body => new JSDOM(body).window.document)
    .then(document => {
      const el = document.querySelector('.today-weather');
      const today = {
        telop: el.querySelector('.weather-telop').textContent,
        date: el.querySelector('.left-style').textContent,
      };
      const caption = `${today.telop} ${today.date}`;
      return {
        body: el.innerHTML,
        caption,
        image: el.querySelector('img').src,
      };
    });
  }
  find(search) {
    const promise = promiseGen();
    weather.find({ search, degreeType: 'C' }, (e, res) => {
      if (e) {
        logger.error(e);
        promise.reject(e);
      } else {
        promise.resolve(res);
      }
    });
    return promise.instance;
  }
}
module.exports = {
  Weather,
};
