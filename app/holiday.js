import dayjs from 'dayjs';

Object.assign(process.env, {
  TZ: 'Asia/Tokyo',
});

const myself = {
  [dayjs('2026-04-30 00:00:00+09:00').unix()]: '特別休暇',
  [dayjs('2026-11-02 00:00:00+09:00').unix()]: '特別休暇',
  [dayjs('2026-12-29 00:00:00+09:00').unix()]: '特別休暇',
};

export const getHoliday = async (now = dayjs()) => {
  const holidaysJp = await fetch('https://holidays-jp.github.io/api/v1/datetime.json')
  .then(res => res.json());
  const holidays = { ...holidaysJp, ...myself };

  const dayAfter = [];
  for (let i = 0; i <= 10; i++) {
    const after = now.add(i, 'day').startOf('day');
    const holiday = holidays[after.unix()];
    if (holiday) {
      const when = ['今日', '明日', '明後日'][i] ?? `${i}日後`;
      const message = `${when} ${after.format('YYYY-MM-DD')} は「${holiday}」です`;
      dayAfter.push({
        after: i,
        holiday,
        message,
      });
    }
  }

  return dayAfter.map(item => item.message);
};

export const isHoliday = async () => {
  const today = dayjs().startOf('day');
  if ([0, 6].includes(today.day())) return true;

  const holidays = await fetch('https://holidays-jp.github.io/api/v1/datetime.json')
  .then(res => res.json());

  return Boolean(holidays[today.unix()]);
};

export default {
  getHoliday,
  isHoliday,
};
