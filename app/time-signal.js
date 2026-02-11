import { createHash } from 'crypto';
import dayjs from 'dayjs';
import webPush from 'web-push';
import { Logger } from '@jobscale/logger';
import { db } from './db.js';
import { store } from './store.js';
import { getHoliday } from './holiday.js';

const logger = new Logger({ timestamp: true, noPathName: true });

const formatTimestamp = (ts = Date.now(), withoutTimezone = false) => {
  const timestamp = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(ts));
  if (withoutTimezone) return timestamp;
  return `${timestamp}+09:00`;
};

const sliceByUnit = (array, unit) => {
  const count = Math.ceil(array.length / unit);
  return new Array(count).fill()
  .map((_, i) => array.slice(unit * i, unit * (i + 1)));
};

export class TimeSignal {
  render(template, data) {
    return Object.entries({
      TEMPLATE_LOGIN: data.login ?? 'anonymous',
      TEMPLATE_HOST: data.host ?? 'unknown host',
    }).reduce(
      (str, [key, value]) => str.replaceAll(`{{${key}}}`, value ?? ''),
      template,
    );
  }

  async pushSignal(payload, users) {
    await Promise.all(
      users.filter(user => user.subscription)
      .map(user => {
        const { subscription } = user;
        const body = this.render(payload.body, user);
        const notification = { ...payload, body };
        logger.info(JSON.stringify(notification));
        return webPush.sendNotification(subscription, JSON.stringify(notification), { TTL: 60 })
        .then(() => logger.info('sendNotification', JSON.stringify(user)))
        .catch(e => {
          logger.error(e, JSON.stringify(user));
          if ([404, 410].includes(e.statusCode || e.status)) {
            const hash = createHash('sha3-256').update(subscription.endpoint).digest('base64');
            delete this.users[hash];
          }
        });
      }),
    );
  }

  async timeSignal() {
    const MAX_MINUTES = 7 * 60 * 1000;
    const opts = {
      time: dayjs().add(1, 'hour').startOf('hour'),
    };
    opts.target = opts.time.subtract(15, 'second');
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

    opts.left = opts.target.diff(dayjs());
    logger.info(JSON.stringify({ left: opts.left / 1000 }));
    if (opts.left < 0 || opts.left > MAX_MINUTES) return;
    await new Promise(resolve => {
      const timeout = setInterval(() => {
        if (opts.target.diff(dayjs()) > 0) return;
        clearInterval(timeout);
        resolve();
      }, 1000);
    });

    const timestamp = formatTimestamp(opts.time);
    const [, time] = timestamp.split(/[+ ]/);
    const [hh, mm] = time.split(':');
    const icon = `/png-clock/${hh}_${mm}.png`;
    const expired = formatTimestamp(opts.target.add(22, 'second'));
    const holidays = await getHoliday(dayjs().add(1, 'hour'));
    const body = [
      `It's ${timestamp} o'clock`,
      '',
      '{{TEMPLATE_LOGIN}} - {{TEMPLATE_HOST}}',
      '',
      ...holidays,
    ].join('\n');
    const payload = {
      title: 'Time Signal', expired, body, icon,
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
