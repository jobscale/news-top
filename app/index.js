import zlib from 'zlib';
import dayjs from 'dayjs';
import { DynamoDBClient, CreateTableCommand, waitUntilTableExists } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@jobscale/logger';
import { aiCalc } from './llm.js';
import env from './env.js';
import { newsFetch as rssNewsFetch } from './rss.js';
import { newsFetch as yahooNewsFetch } from './yahoo.js';
import { newsFetch as nikkeiNewsFetch } from './nikkei.js';
import { newsFetch as asahiNewsFetch } from './asahi.js';
import { priceFetch as amazonPriceFetch } from './amazon.js';

const logger = new Logger({ noPathName: true, timestamp: true });
const auth = JSON.parse(Buffer.from(env.auth, 'base64').toString());
Object.assign(process.env, {
  AWS_REGION: 'ap-northeast-1',
  AWS_ACCESS_KEY_ID: auth.id,
  AWS_SECRET_ACCESS_KEY: auth.key,
});
const TableName = 'News';
const [, endpoint] = [
  'https://lo-stack.jsx.jp',
  process.env.XDG_SESSION_DESKTOP === 'cinnamon' ? 'http://lo-stack.x.jsx.jp:4566' : 'https://lo-stack.x.jsx.jp',
  'http://lo-stack.x.jsx.jp:4566',
];
const ddb = new DynamoDBClient({
  maxAttempts: 10,
  // logger,
  endpoint,
});
const ddbDoc = new DynamoDBDocumentClient(ddb);

const formatTimestamp = (ts = Date.now(), withoutTimezone = false) => {
  const timestamp = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(ts));
  if (withoutTimezone) return timestamp;
  return `${timestamp}+09:00`;
};

export class App {
  rss() {
    return rssNewsFetch()
    .then(async anchorList => {
      for (const anchor of anchorList) {
        const [score, title] = await this.filterItem(anchor.title, anchor.media);
        if (title) {
          return [[`<${anchor.href}|${title}>`, '```', score, '```'].join('\n')];
        }
      }
      return [];
    });
  }

  yahoo() {
    return yahooNewsFetch()
    .then(async anchorList => {
      for (const anchor of anchorList) {
        const [score, title] = await this.filterItem(anchor.title, anchor.media);
        if (title) {
          return [[`<${anchor.href}|${title}>`, '```', score, '```'].join('\n')];
        }
        if (dayjs().minute() >= 58) break;
      }
      return [];
    });
  }

  nikkei() {
    return nikkeiNewsFetch()
    .then(async anchorList => {
      for (const anchor of anchorList) {
        const [score, title] = await this.filterItem(anchor.title, anchor.media);
        if (title) {
          return [[`<${anchor.href}|${title}>`, '```', score, '```'].join('\n')];
        }
      }
      return [];
    });
  }

  asahi() {
    return asahiNewsFetch()
    .then(async anchorList => {
      for (const anchor of anchorList) {
        const [score, title] = await this.filterItem(anchor.title, anchor.media);
        if (title) {
          return [[`<${anchor.href}|${title}>`, '```', score, '```'].join('\n')];
        }
      }
      return [];
    });
  }

  async createTable() {
    const util = [{ client: ddb, maxWaitTime: 60 }, { TableName }];
    await ddb.send(new CreateTableCommand({
      TableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [{
        AttributeName: 'Title', AttributeType: 'S',
      }],
      KeySchema: [{
        AttributeName: 'Title', KeyType: 'HASH',
      }],
    }));
    const result = await waitUntilTableExists(...util).catch(ea => logger.warn(ea.message));
    if (!result) {
      await new Promise(resolve => { setTimeout(resolve, 1000); });
      return this.createTable();
    }
    logger.info('Table created successfully');
    return result;
  }

  async filterItem(Title, media, opts = { attempts: 1 }) {
    const { Item } = await ddbDoc.send(new GetCommand({
      TableName,
      Key: { Title },
    }))
    .catch(async e => {
      logger.warn(e.message, 'Try CreateTable');
      await this.createTable();
      if (opts.attempts) {
        opts.attempts--;
        return this.filterItem(Title, media, opts);
      }
      throw e;
    });
    if (Item) return [];
    await ddbDoc.send(new PutCommand({
      TableName,
      Item: { Title },
    }));

    const Key = { Title: 'history' };
    const getHistory = async () => {
      const { Item: historyItem = {} } = await ddbDoc.send(new GetCommand({
        TableName, Key,
      }));
      const { history = [] } = historyItem;
      if (Array.isArray(history)) return history;
      return JSON.parse(zlib.gunzipSync(Buffer.from(history, 'base64')).toString());
    };
    const LIMIT = formatTimestamp(dayjs().subtract(90, 'day'));
    const history = (await getHistory()
    .catch(e => {
      logger.warn(e.message);
      return [];
    }))
    .filter(v => v.timestamp >= LIMIT);
    const ai = { headline: true };
    const titles = history.filter(v => v.newsworthiness).map(v => v.Title);
    ai.duplicate = this.hasDuplicate(Title, titles, 0.6);
    if (ai.duplicate) ai.headline = false;
    if (ai.headline) Object.assign(ai, await aiCalc(Title));
    if ((ai.score ?? 0) < 4) ai.headline = false;
    const news = {
      Title, ...ai, timestamp: formatTimestamp(),
    };
    logger.info({ news });
    history.push(JSON.parse(JSON.stringify(news)));
    const detail = JSON.stringify({
      ...ai,
      duplicate: undefined,
      headline: undefined,
      media,
    }, null, 2);
    const cache = {};
    const compress = () => {
      cache.compressed = zlib.gzipSync(JSON.stringify(history)).toString('base64');
      return cache.compressed;
    };
    const ITEM_LIMIT = 400 * 1024;
    while (Buffer.byteLength(JSON.stringify(marshall({
      ...Key, history: compress(),
    })), 'utf8') >= ITEM_LIMIT) { history.shift(); }
    await ddbDoc.send(new PutCommand({
      TableName, Item: { ...Key, history: cache.compressed },
    }));

    if (!ai.headline) return [detail];
    return [detail, Title];
  }

  hasDuplicate(target, titles, threshold = 0.5) {
    for (const title of titles) {
      const isDuplicate = this.similarity(title, target) >= threshold;
      if (isDuplicate) return true;
    }
    return false;
  }

  similarity(a, b) {
    const setA = [...a];
    const setB = [...b];
    let match = 0;
    for (const ch of setA) {
      const index = setB.indexOf(ch);
      if (index !== -1) {
        match += 1;
        setB.splice(index, 1); // 一度一致した文字は使わない
      }
    }
    const maxLength = Math.max(setA.length, b.length);
    return match / maxLength; // 一致率
  }

  async amazon(ts) {
    if (ts < '08:00' || ts > '20:10') return [];
    const priseList = await amazonPriceFetch();
    logger.info(ts, JSON.stringify(priseList.map(
      item => `${item.name} = ${item.price.toLocaleString()} / ${item.sale.toLocaleString()}`,
    ), null, 2));
    const sales = priseList.filter(item => {
      if (ts >= '11:00' && ts <= '11:10') return true;
      return item.price <= item.sale;
    }).map(item => `${item.name} <${item.url}|${item.price.toLocaleString()}>`);
    return sales;
  }
}

export const app = new App();
export default { App, app };
