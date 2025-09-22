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
    const opts = {
      time: dayjs().endOf('hour').add(1, 'second'),
    };
    opts.target = opts.time.subtract(10, 'second');
    opts.left = opts.target.diff(dayjs());
    const MAX_MINUTES = 5 * 60 * 1000;
    if (opts.left < 0 || opts.left > MAX_MINUTES) return;
    await new Promise(resolve => { setTimeout(resolve, opts.left); });
    const timestamp = formatTimestamp(opts.time);
    const holidays = await getHoliday();
    const body = [`Time is it ${timestamp}`, '', ...holidays].join('\n');
    const payload = {
      title: 'Time Signal',
      body,
      icon: '/favicon.ico',
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
