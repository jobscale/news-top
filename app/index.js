import dayjs from 'dayjs';
import { JSDOM } from 'jsdom';
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import logger from '@jobscale/logger';
import env from './env.js';

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

export default class App {
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
      for (const anchor of anchorList) {
        const Title = anchor.textContent.trim();
        const item = await this.runItem(Title)
        .catch(e => logger.error(e) || this.runItem(Title));
        if (item) {
          news.push(`<${anchor.href}|${item}>`);
          break;
        }
      }
      return news;
    });
  }

  async runItem(Title) {
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
    const titles = history.map(v => v.Title);
    const duplicate = this.hasDuplicate(Title, titles, 0.5);
    const emergency = [
      '地震', '津波', '震度', '噴火', 'テロ',
      '洪水', '水害', '氾濫', '決壊', '豪雨', '落雷',
      '大阪', '好適環境水', '寒波', '障害', '停電', '断水',
      '買収', '合併', '上場', '株価', '為替', '原子',
    ].filter(em => Title.match(em)).length !== 0;
    const deny = [
      'か$', 'も$', 'へ$', '語る', '明かす', 'しない', '\\?',
      '熱中', '真夏', '猛暑', '酷暑', '残暑', '関東', '都心', '都市',
      '北朝鮮', '中国', '韓国', 'ウクライナ', 'ロシア', 'ガザ', 'トランプ',
      '空爆', '兵士', '民間', '役員', '不安', '努力', 'マニフェスト', '代表',
      '虚偽', '苦悩', '死去', '追悼', '搬送', '入院', '退院', '危篤', '不明',
      '報告', '調査', '監督', '解説', '判定', '要請', '無罪', '有罪', '判決',
      '論点', 'リスク', '意向', '負け', '優勝', '勝利', '期限', '関税', '疑問',
      '裏側', '発表', '公表', '非難', '表明', '棄却', '貿易', '急逝', '疑惑',
      '大谷', '妊娠', '出産', '結婚', '離婚', '再婚', '選挙', '投票', '支持',
      '選手', '球団', '野球', 'サッカー', 'バスケ', 'バレー', '卓球', '柔道',
      'フェンシング', '剣道', 'ボクシング', 'カーリング', 'テニス', 'ラグビー',
      '怪我', '故障', '闘病', '対談', '責任', '決意', '決断', '決定', '未定',
      '抗議', '披露', '人気', '話題', '流行', 'スポーツ', '会話', '会談', '会議',
      '価格', '抵抗', '辞職', '辞任', '撤退', '病院', '病気', '再審', '審議',
      '辞意', '引退', '横領', '着服', '疑い', '容疑', '賠償', '申告', '申請',
      '国防', '防衛', '異議', '絶望', '歓喜', '証言', '旅行', '逃亡', '逃走',
    ].filter(text => Title.match(new RegExp(text))).length !== 0;
    history.push({ Title, timestamp: dayjs().unix(), emergency, duplicate, deny });
    await ddbDoc.send(new PutCommand({
      TableName,
      Item: { Title: 'history', history },
    }));
    if (!emergency) {
      if (deny) return undefined;
      if (duplicate) return undefined;
    }
    return Title;
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
