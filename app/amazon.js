import { Agent } from 'undici';
import { JSDOM } from 'jsdom';

const list = [
  { name: 'DICE BANK ', sale: 19000, url: 'https://www.amazon.co.jp/gp/product/B0D8VX1DT7' },
  { name: 'DICE BANK ', sale: 19000, url: 'https://www.amazon.co.jp/gp/product/B0FRLC8KJZ' },
  { name: 'DICE BANK ', sale: 19000, url: 'https://www.amazon.co.jp/gp/product/B0FRM7XM1Q' },
  { name: 'DICE BANK ', sale: 19000, url: 'https://www.amazon.co.jp/gp/product/B0FRLVNDB7' },
  { name: 'DICE BANK ', sale: 19000, url: 'https://www.amazon.co.jp/gp/product/B0FRMFX6C1' },
  { name: 'DICE BANK ', sale: 19000, url: 'https://www.amazon.co.jp/gp/product/B0FRLVDH3N' },
  { name: 'DICE BANK MAG ', sale: 19000, url: 'https://www.amazon.co.jp/gp/product/B0D8W172JS' },
  { name: 'DICE BANK MBK ', sale: 19000, url: 'https://www.amazon.co.jp/gp/product/B0C4THDKMD' },
  { name: 'DICE BANK CAMO', sale: 19000, url: 'https://www.amazon.co.jp/gp/product/B0C4THSTS1' },
  { name: 'DICE BANK DMSM', sale: 19000, url: 'https://www.amazon.co.jp/gp/product/B0C4TJ6YBB' },
  { name: 'DICE BANK Y   ', sale: 19000, url: 'https://www.amazon.co.jp/gp/product/B0C4TFY37W' },
];
const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const headers = { 'accept-language': 'ja', 'user-agent': userAgent };
const logger = console;

class Amazon {
  fetch(input, opts = {}) {
    const { timeout = 16_000, ...init } = opts;
    const ac = new AbortController();
    ac.terminate = () => clearTimeout(ac.terminate.tid);
    ac.terminate.tid = setTimeout(() => ac.abort(), timeout);
    return fetch(input, { ...init, signal: ac.signal })
    .finally(() => ac.terminate());
  }

  async priceFetch() {
    const dispatcher = new Agent({ connect: { family: 4 } });
    const items = [];
    for (const item of JSON.parse(JSON.stringify(list))) {
      await this.fetch(item.url, { headers, dispatcher })
      .then(res => res.text())
      .then(body => new JSDOM(body).window.document)
      .then(document => {
        const localePrice = document.querySelector('#corePriceDisplay_desktop_feature_div .a-price-whole');
        item.price = Number.parseInt(localePrice?.textContent.replace(/[^\d.-]/g, ''), 10);
        if (!item.price) item.price = document.querySelector('[data-action="show-all-offers-display"]')?.textContent.trim();
        item.price = item.price.toLocaleString();
        item.sale = item.sale.toLocaleString();
        items.push(item);
      })
      .catch(e => logger.error({ cause: e.cause, code: e.code, message: e.message }));
    }
    return items;
  }
}

export const priceFetch = () => new Amazon().priceFetch();
