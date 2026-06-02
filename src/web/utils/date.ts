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

  isoWeek: (date: Date = new Date()): string => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  },

  addWeeks: (weekStr: string, delta: number): string => {
    const [yearStr, wPart] = weekStr.split("-W");
    const year = parseInt(yearStr, 10);
    const weekNum = parseInt(wPart, 10);
    // Jan 4 is always in ISO week 1; find its Monday
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dow = jan4.getUTCDay() || 7; // Mon=1 ... Sun=7
    const week1Mon = new Date(jan4.getTime() - (dow - 1) * 86400000);
    // Monday of target week
    const target = new Date(week1Mon.getTime() + (weekNum - 1 + delta) * 7 * 86400000);
    // Compute ISO week string (pure UTC to avoid local-offset issues)
    const d = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const actualWeek = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(actualWeek).padStart(2, "0")}`;
  },

  fmtIsoWeek: (weekStr: string): string => {
    const [year, wPart] = weekStr.split("-W");
    return `${year}年 第${parseInt(wPart, 10)}週`;
  },
};
