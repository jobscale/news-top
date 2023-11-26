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
const auth = JSON.parse(Buffer.from('eyJpZCI6IkFLSUEyWFBUNkVEN09WQTY3SVY3Iiwia2V5IjoiNjM5YUtFWWRMV3Y5YXVoUlltT0F1ZXRUVDFzYUkvVEhJMHg5ZVBENiJ9', 'base64').toString());
Object.assign(process.env, {
  AWS_REGION: 'ap-northeast-1',
  AWS_ACCESS_KEY_ID: auth.id,
  AWS_SECRET_ACCESS_KEY: auth.key,
});
const TableName = 'News';
const endpoint = 'https://ddb.jsx.jp';
const ddb = new DynamoDBClient({
  maxAttempts: 20,
  logger,
  endpoint,
});
const ddbDoc = new DynamoDBDocumentClient(ddb);

class App {
  fetch(uri) {
    return fetch(uri)
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
        if (item) news.push(`<${anchor.href}|${item}>`);
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
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1,
        },
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
}

module.exports = {
  App,
  app: new App(),
};
