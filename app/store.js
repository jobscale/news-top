import {
  S3Client, PutObjectCommand, GetObjectCommand,
  ListObjectsV2Command, DeleteObjectCommand, CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { db } from './db.js';

const { ENV } = process.env;

const { Bucket, forceCreate } = {
  stg: {
    Bucket: 'stg-store-jsx',
  },
  dev: {
    Bucket: 'dev-store-jsx',
  },
  test: {
    Bucket: 'test-store-jsx',
    forceCreate: true,
  },
}[ENV];

const config = {
  stg: {
    region: 'us-east-1',
  },
  dev: {
    region: 'us-east-1',
  },
  test: {
    region: 'ap-northeast-1',
    endpoint: 'https://lo-stack.jsx.jp',
    urlParser: url => {
      const op = new URL(url);
      return {
        protocol: op.protocol,
        hostname: op.hostname,
        port: op.port,
        path: op.pathname,
      };
    },
    endpointProvider: ep => ({ url: `${ep.Endpoint}${ep.Bucket}/` }),
  },
}[ENV];

const fetchObjectChunk = res => new Promise((resolve, reject) => {
  const dataChunks = [];
  res.Body.once('error', e => reject(e));
  res.Body.on('data', chunk => dataChunks.push(chunk));
  res.Body.once('end', () => resolve(dataChunks.join('')));
});

export class Store {
  async config() {
    const { credentials } = await db.getValue('config/credentials', 'store-jsx');
    return {
      ...config,
      credentials,
    };
  }

  async list(tableName, ContinuationToken, opt = { list: [] }) {
    const schema = `${ENV}/${tableName}`;
    const con = await this.connection(schema);
    const Prefix = `${schema}/`;
    const { Contents = [], NextContinuationToken } = await con.send(new ListObjectsV2Command({
      Bucket,
      Prefix,
      ContinuationToken,
    }));
    opt.list.push(
      ...Contents.map(content => {
        const item = {
          key: content.Key.slice(Prefix.length),
          lastModified: content.LastModified,
          size: content.Size,
        };
        return item;
      }),
    );
    if (!NextContinuationToken) return opt.list;
    return this.list(tableName, NextContinuationToken, opt);
  }

  async getValue(tableName, key) {
    const schema = `${ENV}/${tableName}`;
    const con = await this.connection(schema);
    const Key = `${schema}/${key}`;
    const { Body } = await con.send(new GetObjectCommand({
      Bucket,
      Key,
    }))
    .catch(() => ({}));
    if (!Body) return undefined;
    const item = await fetchObjectChunk({ Body });
    return JSON.parse(item);
  }

  async setValue(tableName, key, value) {
    const schema = `${ENV}/${tableName}`;
    const con = await this.connection(schema);
    if (forceCreate) {
      await con.send(new CreateBucketCommand({ Bucket }));
    }
    const Key = `${schema}/${key}`;
    await con.send(new PutObjectCommand({
      Bucket,
      Key,
      Body: JSON.stringify(value, null, 2),
    }));
    await new Promise(resolve => { setTimeout(resolve, 200); });
    return { key };
  }

  async deleteValue(tableName, key) {
    const schema = `${ENV}/${tableName}`;
    const con = await this.connection(schema);
    const Key = `${schema}/${key}`;
    await con.send(new DeleteObjectCommand({ Bucket, Key }));
    await new Promise(resolve => { setTimeout(resolve, 200); });
  }

  async connection(tableName) {
    if (!this.cache) this.cache = {};
    if (this.cache[tableName]) return this.cache[tableName];
    this.cache[tableName] = new S3Client(await this.config());
    return this.cache[tableName];
  }
}

export const store = new Store();
export const connection = tableName => store.connection(tableName);

export default {
  store,
  connection,
};
