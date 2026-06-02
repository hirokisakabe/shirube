import type { Task } from "../api/tasks";
import { DateU, WEEKDAYS_JP } from "../utils/date";

type Props = {
  weekStart: Date;
  tasks: Task[];
  showWeekend: boolean;
};

export function WeekSummary({ weekStart, tasks, showWeekend }: Props) {
  const days = Array.from({ length: showWeekend ? 7 : 5 }, (_, i) => DateU.addDays(weekStart, i));
  let total = 0, done = 0;

  const per = days.map((d) => {
    const items = tasks.filter((t) => t.date === DateU.key(d));
    const dn = items.filter((t) => t.doneAt).length;
    total += items.length;
    done += dn;
    return { tot: items.length, done: dn, today: DateU.isToday(d), dow: DateU.dowMon(d) };
  });

  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="summary">
      <div className="sum-stat">
        <span className="sum-num">{done}</span>
        <span className="sum-slash">/</span>
        <span className="sum-tot">{total}</span>
        <span className="sum-label">今週 完了</span>
      </div>
      <div className="sum-bars">
        {per.map((p) => (
          <div key={p.dow} className={`sum-bar${p.today ? ' today' : ''}`} title={`${p.done}/${p.tot}`}>
            <div className="sum-bar-track">
              <div
                className="sum-bar-fill"
                style={{ height: p.tot ? `${(p.done / p.tot) * 100}%` : '0%' }}
              />
            </div>
            <span className="sum-bar-lab">{WEEKDAYS_JP[p.dow]}</span>
          </div>
        ))}
      </div>
      <div className="sum-pct">{pct}<span className="sum-pct-sign">%</span></div>
    </div>
  );
}
