import { DynamoDBClient, GetItemCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';

const { REMOVE } = process.env;

const logger = console;
const TableName = 'News';
const [, endpoint] = [
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
  await client.send(new DeleteTableCommand({
    TableName,
  }));
};

const run = async () => {
  if (REMOVE) {
    await remove();
    logger.info({ table: 'removed' });
    return;
  }
  const data = await client.send(new GetItemCommand({
    TableName,
    Key: marshall({ Title: 'history' }),
  }));

  const item = data?.Item && unmarshall(data.Item);
  if (!item) return;

  const filtered = item.history;
  // .filter(entry => Number.isInteger(entry?.score) && entry.score >= 0)
  // .slice(-30);

  logger.info(JSON.stringify(filtered, null, 2));
};

run().catch(logger.error);
