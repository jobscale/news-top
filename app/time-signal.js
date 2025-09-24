import dayjs from 'dayjs';
import webPush from 'web-push';
import { createHash } from 'crypto';
import { Logger } from '@jobscale/logger';
import { db } from './db.js';
import { store } from './store.js';
import { getHoliday } from './holiday.js';

const logger = new Logger({ timestamp: true, noPathName: true });

const formatTimestamp = ts => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}).format(ts || new Date());

const sliceByUnit = (array, unit) => {
  const count = Math.ceil(array.length / unit);
  return new Array(count).fill()
  .map((_, i) => array.slice(unit * i, unit * (i + 1)));
};

export class TimeSignal {
  async pushSignal(payload, users) {
    await Promise.all(
      users.filter(user => user.subscription)
      .map(user => {
        const { subscription } = user;
        return webPush.sendNotification(subscription, JSON.stringify(payload))
        .then(() => logger.info('sendNotification', JSON.stringify(user)))
        .catch(e => {
          logger.error(e, JSON.stringify(user));
          const hash = createHash('sha3-256').update(subscription.endpoint).digest('base64');
          delete this.users[hash];
        });
      }),
    );
  }

  async timeSignal() {
    const opts = {
      time: dayjs().endOf('hour').add(1, 'second'),
    };
    opts.target = opts.time.subtract(10, 'second');
    const MAX_MINUTES = 7 * 60 * 1000;
    opts.left = opts.target.diff(dayjs());
    if (opts.left < 0 || opts.left > MAX_MINUTES) return;

    if (!this.cert) {
      this.cert = await db.getValue('config/certificate', 'secret');
      webPush.setVapidDetails(
        'mailto:jobscale@example.com',
        this.cert.public,
        this.cert.key,
      );
    }
    if (!this.users) {
      this.users = await store.getValue('web/users', 'info');
    }

    logger.info(JSON.stringify({ left: opts.left / 1000 }));
    opts.left = opts.target.diff(dayjs());
    logger.info(JSON.stringify({ left: opts.left / 1000 }));
    if (opts.left < 0 || opts.left > MAX_MINUTES) return;
    await new Promise(resolve => { setTimeout(resolve, opts.left); });
    const timestamp = formatTimestamp(opts.time);
    const expired = `${formatTimestamp(opts.target.add(12, 'second'))} GMT+9`;
    const holidays = await getHoliday();
    const body = [`It's ${timestamp} o'clock`, '', ...holidays].join('\n');
    const payload = {
      title: 'Time Signal', expired, body, icon: '/favicon.ico',
    };
    const unitUsers = sliceByUnit(Object.values(this.users), 10);
    for (const unit of unitUsers) {
      await this.pushSignal(payload, unit);
    }
    const total = unitUsers.reduce((a, b) => a + b.length, 0);
    if (Object.keys(this.users).length < total) {
      await store.setValue('web/users', 'info', this.users);
    }
  }

  async startTimeSignal() {
    await this.timeSignal();
  }
}

export const timeSignal = new TimeSignal();

export default {
  TimeSignal,
  timeSignal,
};
