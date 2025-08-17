import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';

const logger = console;
const client = new DynamoDBClient({
  endpoint: 'http://n100.jsx.jp:4566',
  region: 'ap-northeast-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

const run = async () => {
  const data = await client.send(new GetItemCommand({
    TableName: 'News',
    Key: marshall({ Title: 'history' }),
  }));

  const item = data?.Item && unmarshall(data.Item);
  if (!item) return;

  const filtered = item.history
  .filter(entry => Number.isInteger(entry?.score) && entry.score >= 7)
  // .filter(entry => !entry?.deny)
  // .filter(entry => entry?.emergency)
  .slice(-30);

  logger.info(JSON.stringify(filtered, null, 2));
};

run().catch(logger.error);
