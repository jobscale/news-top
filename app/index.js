const { JSDOM } = require('jsdom');
const {
  DynamoDBClient,
  CreateTableCommand,
} = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} = require('@aws-sdk/lib-dynamodb');

const logger = console;
const wait = ms => new Promise(resolve => { setTimeout(resolve, ms); });
const toNumber = num => num.toLocaleString();
const auth = JSON.parse(Buffer.from('eyJpZCI6IkFLSUEyWFBUNkVEN09WQTY3SVY3Iiwia2V5IjoiNjM5YUtFWWRMV3Y5YXVoUlltT0F1ZXRUVDFzYUkvVEhJMHg5ZVBENiJ9', 'base64').toString());
Object.assign(process.env, {
  AWS_REGION: 'ap-northeast-1',
  AWS_ACCESS_KEY_ID: auth.id,
  AWS_SECRET_ACCESS_KEY: auth.key,
});
const TableName = 'News';
const endpoint = 'https://lo-stack.jsx.jp';
const ddb = new DynamoDBClient({
  maxAttempts: 20,
  logger,
  endpoint,
});
const ddbDoc = new DynamoDBDocumentClient(ddb);

class App {
  fetch(uri) {
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
      const news = [];
      for (const anchor of anchorList) { // eslint-disable-line no-restricted-syntax
        const item = await this.runItem(anchor.textContent)
        .catch(e => logger.error(e) || this.runItem(anchor.textContent));
        if (item) {
          news.push(`<${anchor.href}|${item}>`);
          break;
        }
      }
      return news;
    });
  }

  async runItem(Title) {
    const deny = ['か$', 'も$'];
    const title = Title.trim();
    const isDeny = deny.filter(text => title.match(new RegExp(text))).length;
    if (isDeny) return undefined;
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
          AttributeName: 'Title',
          AttributeType: 'S',
        }],
        KeySchema: [{
          AttributeName: 'Title',
          KeyType: 'HASH',
        }],
      }));
      await wait(15000);
    });
    if (Item) return undefined;
    await ddbDoc.send(new PutCommand({
      TableName,
      Item: { Title },
    }));
    return Title;
  }

  async amz(list, ts) {
    const priseList = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const amz of list) {
      await this.fetchAmz(amz.uri)
      .then(price => priseList.push({ ...amz, price }))
      .catch(e => logger.error(JSON.stringify({ message: e.message, amz })));
    }
    logger.info(ts, JSON.stringify(priseList.map(
      amz => `${amz.name} = ${amz.price} / ${toNumber(amz.sale)}`,
    ), null, 2));
    return priseList.filter(amz => {
      const sale = Number.parseInt(amz.price.replace(/,/g, ''), 10);
      if (ts > '20:50') return true;
      return sale < amz.sale;
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

module.exports = {
  App,
  app: new App(),
};
