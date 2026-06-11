import { useRef, useState } from "react";
import type { Task } from "../api/tasks";
import { DateU, WEEKDAYS_JP } from "../utils/date";
import { dayItems } from "../hooks/useTasks";
import { AddInput } from "./AddInput";
import { TodoItem } from "./TodoItem";

type Ctx = {
  tasks: Task[];
  add: (date: string, text: string) => void;
  toggle: (id: number) => void;
  remove: (id: number) => void;
  edit: (id: number, text: string) => void;
  moveTo: (id: number, date: string) => void;
  undo: () => void;
};

type Props = {
  monthDate: Date;
  ctx: Ctx;
  onPickDay: (date: Date) => void;
  showWeekend: boolean;
};

function DropZone({
  dateKey,
  onMove,
  className,
  children,
  onClick,
}: {
  dateKey: string;
  onMove: (id: number, date: string) => void;
  className: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const [over, setOver] = useState(false);
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Cell click is a pointer convenience; primary actions use child controls.
    <div
      className={className + (over ? " drop-over" : "")}
      onClick={onClick}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = Number(e.dataTransfer.getData("text/todo-id"));
        if (id) onMove(id, dateKey);
      }}
    >
      {children}
    </div>
  );
}

function MonthCell({
  date,
  ctx,
  inMonth,
  today,
  onPickDay,
}: {
  date: Date;
  ctx: Ctx;
  inMonth: boolean;
  today: boolean;
  onPickDay: (date: Date) => void;
}) {
  const k = DateU.key(date);
  const items = dayItems(ctx.tasks, k);
  const [expanded, setExpanded] = useState(false);
  const inputFocusedRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isExpanded = expanded && items.length > 4;
  const visibleItems = isExpanded ? items : items.slice(0, 4);

  return (
    <DropZone
      dateKey={k}
      onMove={ctx.moveTo}
      className={`mcell${inMonth ? "" : " out"}${today ? " today" : ""}${isExpanded ? " expanded" : ""}`}
      onClick={() => {
        if (!inputFocusedRef.current) onPickDay(date);
      }}
    >
      <div className="mcell-head">
        <span className="mcell-num">{date.getDate()}</span>
        {today && <span className="today-dot" />}
      </div>
      <div
        className="mcell-body"
        onFocus={() => {
          clearTimeout(blurTimerRef.current);
          inputFocusedRef.current = true;
        }}
        onBlur={() => {
          blurTimerRef.current = setTimeout(() => {
            inputFocusedRef.current = false;
          }, 0);
        }}
      >
        {visibleItems.map((t) => (
          <TodoItem
            key={t.id}
            todo={t}
            onToggle={ctx.toggle}
            onRemove={ctx.remove}
            onEdit={ctx.edit}
            variant="compact"
          />
        ))}
        {items.length > 4 && (
          <button
            type="button"
            className="mmore"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((current) => !current);
            }}
          >
            {isExpanded ? "折りたたむ" : `＋${items.length - 4}件`}
          </button>
        )}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Wrapper only prevents parent cell selection; AddInput handles keyboard interaction. */}
        <div onClick={(e) => e.stopPropagation()}>
          <AddInput onAdd={(text) => ctx.add(k, text)} variant="compact" />
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
      <div
        className="month-dow"
        style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}
      >
        {heads.map((w, i) => (
          <div
            key={w}
            className={`mh${i === 6 ? " sun" : ""}${i === 5 ? " sat" : ""}`}
          >
            {w}
          </div>
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
