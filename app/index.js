const { fetch } = require('@jobscale/fetch');
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
const auth = JSON.parse(Buffer.from('eyJpZCI6IkFLSUEyWFBUNkVEN09WQTY3SVY3Iiwia2V5IjoiNjM5YUtFWWRMV3Y5YXVoUlltT0F1ZXRUVDFzYUkvVEhJMHg5ZVBENiJ9', 'base64').toString());
Object.assign(process.env, {
  AWS_REGION: 'ap-northeast-1',
  AWS_ACCESS_KEY_ID: auth.id,
  AWS_SECRET_ACCESS_KEY: auth.key,
});
const ddb = new DynamoDBClient({
  maxAttempts: 20,
  logger,
  endpoint: 'https://ddb.jsx.jp',
});
const ddbDoc = new DynamoDBDocumentClient(ddb);

class App {
  fetch(uri) {
    return fetch.get(uri)
    .then(res => new JSDOM(res.data).window.document)
    .then(document => {
      const list = Array.from(document.querySelectorAll('[aria-label="NEW"]'))
      .map(el => el.parentElement.parentElement.textContent);
      return list;
    })
    .then(async list => {
      const TableName = 'News';
      const news = [];
      for (const Title of list) { // eslint-disable-line no-restricted-syntax
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
        });
        if (!Item) {
          await ddbDoc.send(new PutCommand({
            TableName,
            Item: { Title },
          }));
          news.push(Title);
        }
      }
      return news;
    });
  }
}

module.exports = {
  App,
  app: new App(),
};
