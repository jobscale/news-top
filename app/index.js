import dayjs from 'dayjs';
import { JSDOM } from 'jsdom';
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@jobscale/logger';
import { aiCalc } from './llm.js';
import env from './env.js';

const logger = new Logger({ noPathName: true });
const wait = ms => new Promise(resolve => { setTimeout(resolve, ms); });
const toNumber = num => num.toLocaleString();
const auth = JSON.parse(Buffer.from(env.auth, 'base64').toString());
Object.assign(process.env, {
  AWS_REGION: 'ap-northeast-1',
  AWS_ACCESS_KEY_ID: auth.id,
  AWS_SECRET_ACCESS_KEY: auth.key,
});
const TableName = 'News';
const endpoint = 'https://lo-stack.jsx.jp';
const ddb = new DynamoDBClient({
  maxAttempts: 20,
  // logger,
  endpoint,
});
const ddbDoc = new DynamoDBDocumentClient(ddb);

export class App {
  yahoo(uri) {
    return fetch(uri, {
      headers: {
        'accept-language': 'ja',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    })
    .then(res => res.text())
    .then(body => new JSDOM(body).window.document)
    .then(document => {
      const anchorList = Array.from(document.querySelectorAll('[aria-label="NEW"]'))
      .map(el => el.parentElement.parentElement);
      return anchorList;
    })
    .then(async anchorList => {
      for (const anchor of anchorList) {
        const Title = anchor.textContent.trim();
        const [score, title] = await this.filterItem(Title)
        .catch(e => logger.error(e) || this.filterItem(Title));
        if (title) {
          return [`<${anchor.href}|${title}> Y\n${score}`];
        }
      }
      return [];
    });
  }

  asahi() {
    const baseUrl = 'https://news.tv-asahi.co.jp';
    return fetch(`${baseUrl}/api/lchara_list.php?appcode=n4tAMkmEnY&page=0001`, {
      headers: {
        'accept-language': 'ja',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    })
    .then(res => res.json())
    .then(async res => {
      for (const item of res.item || []) {
        const [score, title] = await this.filterItem(item.title)
        .catch(e => logger.error(e) || this.filterItem(item.title));
        if (title) {
          return [`<${baseUrl}${item.link}|${title}> A\n${score}`];
        }
      }
      return [];
    });
  }

  async filterItem(Title) {
    const { Item } = await ddbDoc.send(new GetCommand({
      TableName,
      Key: { Title },
    }))
    .catch(async e => {
      logger.error(e);
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
      await wait(5000);
    });
    if (Item) return [];
    await ddbDoc.send(new PutCommand({
      TableName,
      Item: { Title },
    }));

    const getHistory = async () => {
      const { Item: { history } } = await ddbDoc.send(new GetCommand({
        TableName,
        Key: { Title: 'history' },
      }));
      return history;
    };
    const LIMIT = dayjs().subtract(90, 'day').unix();
    const history = (await getHistory()
    .catch(e => {
      logger.warn(JSON.stringify(e));
      return [];
    }))
    .filter(v => v.timestamp >= LIMIT);
    const ai = await aiCalc(Title);
    const detail = JSON.stringify({ ...ai, title: undefined }, null, 2);
    ai.headline = true;
    const titles = history.filter(v => v.headline).map(v => v.Title);
    ai.duplicate = this.hasDuplicate(Title, titles, 0.5);
    if (ai.duplicate) ai.headline = false;
    if (ai.score < 4) ai.headline = false;
    history.push({
      ...ai, Title, timestamp: dayjs().unix(),
    });
    const ITEM_LIMIT = 400 * 1024;
    while (Buffer.byteLength(JSON.stringify(marshall({
      Title: 'history', history,
    })), 'utf8') >= ITEM_LIMIT) { history.shift(); }
    await ddbDoc.send(new PutCommand({
      TableName,
      Item: { Title: 'history', history },
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

  async amz(list, ts) {
    const priseList = [];
    for (const amz of list) {
      await this.fetchAmz(amz.uri)
      .then(price => priseList.push({ ...amz, price }))
      .catch(e => logger.error(JSON.stringify({ message: e.message, amz })));
    }
    logger.info(ts, JSON.stringify(priseList.map(
      amz => `${amz.name} = ${toNumber(amz.sale)} / ${amz.price}`,
    ), null, 2));
    return priseList.filter(amz => {
      const sale = Number.parseInt(amz.price.replace(/,/g, ''), 10);
      if (ts >= '12:00' && ts <= '12:10') return true;
      return sale <= amz.sale;
    }).map(amz => `${amz.name} <${amz.uri}|${amz.price}>`);
  }

  fetchAmz(uri) {
    return fetch(uri, {
      headers: {
        'accept-language': 'ja',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    })
    .then(res => res.text())
    .then(body => new JSDOM(body).window.document)
    .then(document => {
      const anchor = document.querySelector('#corePriceDisplay_desktop_feature_div');
      return anchor.querySelector('.a-price-whole').textContent;
    });
  }
}

export const app = new App();
export default { App, app };
