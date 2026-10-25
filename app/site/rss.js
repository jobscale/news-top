import Parser from 'rss-parser';

const logger = console;

const list = [
  'https://www.asahi.com/rss/asahi/newsheadlines.rdf',
  'https://www.asahi.com/rss/asahi/business.rdf',
  'https://www.asahi.com/rss/asahi/science.rdf',
  'https://news.yahoo.co.jp/rss/topics/it.xml',
  'https://news.yahoo.co.jp/rss/media/aptsushinv/all.xml',
  'https://news.yahoo.co.jp/rss/categories/it.xml',
  'https://news.web.nhk/n-data/conf/na/rss/cat0.xml',
];

const parser = new Parser();

export const newsFetch = async () => {
  const titles = [];
  for (const url of list) {
    const [, media] = url.split('.');
    const { items } = await parser.parseURL(url).catch(e => {
      logger.error({ url, ...e });
      return { items: [] };
    });
    const anchorList = items.map(item => {
      const href = item.link;
      return { title: item.title.trim(), href, media };
    });
    titles.push(...anchorList);
  }
  return titles;
};
