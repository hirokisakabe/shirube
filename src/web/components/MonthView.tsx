import { useRef, useState } from "react";
import type { Task } from "../api/tasks";
import { DateU, WEEKDAYS_JP } from "../utils/date";
import { dayItems } from "../hooks/useTasks";
import { AddInput } from "./AddInput";

type Ctx = {
  tasks: Task[];
  add: (date: string, text: string) => void;
  toggle: (id: number) => void;
  moveTo: (id: number, date: string) => void;
};

type Props = {
  monthDate: Date;
  ctx: Ctx;
  onPickDay: (date: Date) => void;
  showWeekend: boolean;
};

function DropZone({
  dateKey, onMove, className, children, onClick,
}: {
  dateKey: string;
  onMove: (id: number, date: string) => void;
  className: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={className + (over ? ' drop-over' : '')}
      onClick={onClick}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setOver(false);
        const id = Number(e.dataTransfer.getData('text/todo-id'));
        if (id) onMove(id, dateKey);
      }}
    >
      {children}
    </div>
  );
}

function MonthCell({ date, ctx, inMonth, today, onPickDay }: {
  date: Date;
  ctx: Ctx;
  inMonth: boolean;
  today: boolean;
  onPickDay: (date: Date) => void;
}) {
  const k = DateU.key(date);
  const items = dayItems(ctx.tasks, k);
  const inputFocusedRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  return (
    <DropZone
      dateKey={k}
      onMove={ctx.moveTo}
      className={`mcell${inMonth ? '' : ' out'}${today ? ' today' : ''}`}
      onClick={() => { if (!inputFocusedRef.current) onPickDay(date); }}
    >
      <div className="mcell-head">
        <span className="mcell-num">{date.getDate()}</span>
        {today && <span className="today-dot" />}
      </div>
      <div
        className="mcell-body"
        onFocus={() => { clearTimeout(blurTimerRef.current); inputFocusedRef.current = true; }}
        onBlur={() => { blurTimerRef.current = setTimeout(() => { inputFocusedRef.current = false; }, 0); }}
      >
        {items.slice(0, 4).map((t) => (
          <div
            key={t.id}
            className={`mtodo${t.doneAt ? ' done' : ''}`}
            draggable
            onClick={(e) => { e.stopPropagation(); ctx.toggle(t.id); }}
            onDragStart={(e) => { e.dataTransfer.setData('text/todo-id', String(t.id)); }}
          >
            <span className="mtodo-dot" />
            <span className="mtodo-text">{t.title}</span>
          </div>
        ))}
        {items.length > 4 && <div className="mmore">＋{items.length - 4}件</div>}
        <div onClick={(e) => e.stopPropagation()}>
          <AddInput onAdd={(text) => ctx.add(k, text)} />
        </div>
      </div>
    </DropZone>
  );
}

export function MonthView({ monthDate, ctx, onPickDay, showWeekend }: Props) {
  const first = DateU.startOfMonth(monthDate);
  const gridStart = DateU.startOfWeek(first);
  let cells = Array.from({ length: 42 }, (_, i) => DateU.addDays(gridStart, i));
  const heads = showWeekend ? WEEKDAYS_JP : WEEKDAYS_JP.slice(0, 5);
  if (!showWeekend) cells = cells.filter((d) => DateU.dowMon(d) <= 4);
  const cols = showWeekend ? 7 : 5;
  const thisMonth = monthDate.getMonth();

  return (
    <div className="month">
      <div className="month-dow" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>
        {heads.map((w, i) => (
          <div key={w} className={`mh${i === 6 ? ' sun' : ''}${i === 5 ? ' sat' : ''}`}>{w}</div>
        ))}
      </div>
      <div
        className="month-grid"
        style={{
          gridTemplateColumns: `repeat(${cols},1fr)`,
        }}
      >
        {cells.map((date) => (
          <MonthCell
            key={DateU.key(date)}
            date={date}
            ctx={ctx}
            inMonth={date.getMonth() === thisMonth}
            today={DateU.isToday(date)}
            onPickDay={onPickDay}
          />
        ))}
      </div>
    </div>
  );
}
