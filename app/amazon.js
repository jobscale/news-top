import { JSDOM } from 'jsdom';

const list = [
  { name: 'DICE BANK MAG ', sale: 17000, url: 'https://www.amazon.co.jp/gp/product/B0D8W172JS' },
  { name: 'DICE BANK MBK ', sale: 17000, url: 'https://www.amazon.co.jp/gp/product/B0C4THDKMD' },
  { name: 'DICE BANK CAMO', sale: 17000, url: 'https://www.amazon.co.jp/gp/product/B0C4THSTS1' },
  { name: 'DICE BANK DMSM', sale: 17000, url: 'https://www.amazon.co.jp/gp/product/B0C4TJ6YBB' },
  { name: 'DICE BANK Y   ', sale: 17000, url: 'https://www.amazon.co.jp/gp/product/B0C4TFY37W' },
];
const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const headers = { 'accept-language': 'ja', 'user-agent': userAgent };

export const priceFetch = async () => {
  const items = [];
  for (const item of list) {
    await fetch(item.url, { headers })
    .then(res => res.text())
    .then(body => new JSDOM(body).window.document)
    .then(document => {
      const localePrice = document.querySelector('#corePriceDisplay_desktop_feature_div .a-price-whole');
      const price = Number.parseInt(localePrice.textContent.replace(/[^\d.-]/g, ''), 10);
      items.push({ ...item, price });
    });
  }
  return items;
};
