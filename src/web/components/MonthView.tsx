import { useRef, useState } from "react";
import type { Task } from "../api/tasks";
import { DateU, WEEKDAYS_JP } from "../utils/date";
import { dayItems } from "../hooks/useTasks";
import { AddInput } from "./AddInput";
import { TodoItem } from "./TodoItem";
import { cn } from "../styles";

type Ctx = {
  tasks: Task[];
  add: (date: string, text: string) => void;
  toggle: (id: number) => void;
  remove: (id: number) => void;
  edit: (id: number, text: string) => void;
  moveTo: (id: number, date: string | null) => void;
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
  expanded,
}: {
  dateKey: string;
  onMove: (id: number, date: string | null) => void;
  className: string;
  children: React.ReactNode;
  onClick?: () => void;
  expanded?: boolean;
}) {
  const [over, setOver] = useState(false);
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Cell click is a pointer convenience; primary actions use child controls.
    <div
      className={cn(
        className,
        over && "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]",
      )}
      data-month-cell={dateKey}
      data-expanded={expanded ? "true" : "false"}
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
  isLastColumn,
  onPickDay,
}: {
  date: Date;
  ctx: Ctx;
  inMonth: boolean;
  today: boolean;
  isLastColumn: boolean;
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
      className={cn(
        "flex min-h-0 cursor-pointer flex-col gap-[3px] overflow-hidden border-b border-r border-[var(--hair-soft)] px-[7px] py-1.5 transition-colors duration-150 hover:bg-[var(--surface-2)]",
        isLastColumn && "border-r-0",
        !inMonth && "bg-[var(--surface-2)]",
        isExpanded && "bg-[var(--surface)]",
      )}
      expanded={isExpanded}
      onClick={() => {
        if (!inputFocusedRef.current) onPickDay(date);
      }}
    >
      <div className="flex items-center gap-[5px]">
        <span
          className={cn(
            "font-[var(--num)] text-sm font-medium",
            !inMonth && "text-[var(--ink-faint)]",
            today &&
              "inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--accent)] text-xs leading-none text-white",
          )}
        >
          {date.getDate()}
        </span>
      </div>
      <div
        className={cn(
          "flex flex-col gap-0.5 overflow-hidden",
          isExpanded && "overflow-y-auto pr-0.5",
        )}
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
            onMoveToInbox={(id) => ctx.moveTo(id, null)}
            variant="compact"
          />
        ))}
        {items.length > 4 && (
          <button
            type="button"
            className="self-start rounded px-0.5 py-px text-[10.5px] text-[var(--ink-faint)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] hover:text-[var(--accent)]"
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
    <div className="flex h-full flex-col">
      <div
        className="grid border-b border-[var(--hair)]"
        style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}
      >
        {heads.map((w, i) => (
          <div
            key={w}
            className={cn(
              "px-2 py-[5px] text-[11px] tracking-[0.05em] text-[var(--ink-soft)]",
              i === 6 && "text-[var(--accent)]",
            )}
          >
            {w}
          </div>
        ))}
      </div>
      <div
        className="grid min-h-0 flex-1 auto-rows-fr"
        style={{
          gridTemplateColumns: `repeat(${cols},1fr)`,
        }}
      >
        {cells.map((date, index) => (
          <MonthCell
            key={DateU.key(date)}
            date={date}
            ctx={ctx}
            inMonth={date.getMonth() === thisMonth}
            today={DateU.isToday(date)}
            isLastColumn={(index + 1) % cols === 0}
            onPickDay={onPickDay}
          />
        ))}
      </div>
    </div>
  );
}
