import { DOMParser } from '../dom-parser.js';

const baseUrl = 'https://www.nikkei.com';
const parser = new DOMParser();
const list = [
  `${baseUrl}/news/category/`,
];
const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const headers = { 'accept-language': 'ja', 'user-agent': userAgent };

export const newsFetch = async () => {
  const titles = [];
  for (const url of list) {
    await fetch(url, { headers })
    .then(res => res.text())
    .then(body => parser.parseFromString(body, 'text/html'))
    .then(document => {
      const selector = '[class^="main"] [class^="textArea"] h2 [href^="/article/"]';
      const anchorList = Array.from(document.querySelectorAll(selector))
      .map(el => {
        const href = `${baseUrl}${el.href}`;
        return { title: el.textContent.trim(), href, media: 'N' };
      });
      titles.push(...anchorList);
    });
  }
  return titles;
};
