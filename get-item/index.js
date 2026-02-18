import zlib from 'zlib';
import {
  DynamoDBClient, GetItemCommand, DeleteTableCommand, waitUntilTableNotExists,
} from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';

const { DELETE } = process.env;

const logger = console;
const TableName = 'News';
const [,, endpoint] = [
  'https://lo-stack.jsx.jp',
  'https://lo-stack.x.jsx.jp',
  'http://lo-stack.x.jsx.jp:4566',
];
const client = new DynamoDBClient({
  endpoint,
  region: 'ap-northeast-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

const remove = async () => {
  const util = [{ client, maxWaitTime: 60 }, { TableName }];
  await client.send(new DeleteTableCommand({ TableName })).catch(e => logger.warn(e.message));
  await waitUntilTableNotExists(...util);
  logger.info({ TableName, status: 'deleted' });
};

const run = async () => {
  if (DELETE) {
    await remove();
    return;
  }

  const Key = marshall({ Title: 'history' });
  const getHistory = async () => {
    const { Item: historyItem = {} } = await client.send(new GetItemCommand({
      TableName, Key,
    }));
    const { history = [] } = unmarshall(historyItem);
    if (Array.isArray(history)) return history;
    return JSON.parse(zlib.gunzipSync(Buffer.from(history, 'base64')).toString());
  };
  const history = await getHistory()
  .catch(e => {
    logger.warn(e.message);
    return [];
  });

  const isNumber = v => Number.parseFloat(v) === v * 1;
  const filtered = history
  .filter(entry => isNumber(entry.personal) && entry.personal === 0);
  // .slice(-30);

  logger.info(JSON.stringify(filtered, null, 2));
};

run().catch(logger.error);
