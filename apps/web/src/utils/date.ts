export const WEEKDAYS_JP = ['月', '火', '水', '木', '金', '土', '日'];

const pad = (n: number) => String(n).padStart(2, '0');

export const DateU = {
  key: (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,

  parse: (s: string) => {
    const [y, m, day] = s.split('-').map(Number);
    return new Date(y, m - 1, day);
  },

  addDays: (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  },

  // Monday-start week index: Mon=0 ... Sun=6
  dowMon: (d: Date) => (d.getDay() + 6) % 7,

  startOfWeek: (d: Date) => {
    const dow = (d.getDay() + 6) % 7;
    const x = new Date(d);
    x.setDate(d.getDate() - dow);
    return x;
  },

  startOfMonth: (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1),

  sameDay: (a: Date, b: Date) =>
    `${a.getFullYear()}-${pad(a.getMonth() + 1)}-${pad(a.getDate())}` ===
    `${b.getFullYear()}-${pad(b.getMonth() + 1)}-${pad(b.getDate())}`,

  today: () => new Date(),

  isToday: (d: Date) => {
    const t = new Date();
    return d.getFullYear() === t.getFullYear() &&
      d.getMonth() === t.getMonth() &&
      d.getDate() === t.getDate();
  },

  isPast: (d: Date) => {
    const t = new Date();
    const tk = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` < tk;
  },

  fmtMonth: (d: Date) => `${d.getFullYear()}年 ${d.getMonth() + 1}月`,

  fmtWeek: (a: Date) => `${a.getMonth() + 1}/${a.getDate()}週`,
};
