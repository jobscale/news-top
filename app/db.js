import { logger } from '@jobscale/logger';
import {
  SSMClient, GetParameterCommand, PutParameterCommand,
  GetParametersByPathCommand, DeleteParameterCommand,
} from '@aws-sdk/client-ssm';
import { connect } from './connect.js';

const { ENV } = process.env;

const config = {
  stg: { region: 'us-east-1' },
  dev: { region: 'us-east-1' },
  test: { region: 'ap-northeast-1' },
}[ENV];

export class DB {
  async list(tableName, NextToken, opt = { list: [] }) {
    const schema = `${ENV}/${tableName}`;
    const con = await this.connection(schema);
    const Path = `/${schema}/`;
    const { Parameters, NextToken: nextToken } = await con.send(new GetParametersByPathCommand({
      Path,
      Recursive: true,
      WithDecryption: true,
      NextToken,
    }));
    opt.list.push(
      ...Parameters.map(parameter => {
        const item = JSON.parse(parameter.Value);
        item.key = parameter.Name.replace(`/${schema}/`, '');
        return item;
      }),
    );
    if (!nextToken) return opt.list;
    return this.list(tableName, nextToken, opt);
  }

  async getValue(tableName, key) {
    const schema = `${ENV}/${tableName}`;
    const con = await this.connection(schema);
    const Name = `/${schema}/${key}`;
    const { Parameter } = await con.send(new GetParameterCommand({
      Name,
      WithDecryption: true,
    }))
    .catch(e => {
      logger.error(e.message);
      return {};
    });
    if (!Parameter) return undefined;
    return JSON.parse(Parameter.Value);
  }

  async setValue(tableName, key, value) {
    const schema = `${ENV}/${tableName}`;
    const con = await this.connection(schema);
    const Name = `/${schema}/${key}`;
    await con.send(new PutParameterCommand({
      Name,
      Value: JSON.stringify(value, null, 2),
      Type: 'String',
      Overwrite: true,
    }));
    await new Promise(resolve => { setTimeout(resolve, 1000); });
    return { key };
  }

  async deleteValue(tableName, key) {
    const schema = `${ENV}/${tableName}`;
    const con = await this.connection(schema);
    const Name = `/${schema}/${key}`;
    await con.send(new DeleteParameterCommand({ Name }));
    await new Promise(resolve => { setTimeout(resolve, 1000); });
  }

  async connection(tableName) {
    if (!this.cache) this.cache = {};
    if (this.cache[tableName]) return this.cache[tableName];
    this.cache[tableName] = new SSMClient({
      ...await connect.credentials(),
      ...config,
    });
    return this.cache[tableName];
  }
}

export const db = new DB();
export const connection = tableName => db.connection(tableName);
export default { db, connection };
