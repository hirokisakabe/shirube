import { useState } from "react";
import type { Task } from "../api/tasks";
import { DateU, WEEKDAYS_JP } from "../utils/date";
import { AddInput } from "./AddInput";
import { TodoItem } from "./TodoItem";
import { dayItems, dayStats } from "../hooks/useTasks";
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
  weekStart: Date;
  ctx: Ctx;
  layout: "columns" | "focus" | "rows";
  showWeekend: boolean;
};

function DropZone({
  dateKey,
  onMove,
  className,
  children,
  style,
  onClick,
}: {
  dateKey: string;
  onMove: (id: number, date: string) => void;
  className: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const [over, setOver] = useState(false);
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Column click is a pointer convenience; primary actions use child controls.
    <div
      className={cn(
        className,
        over && "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]",
      )}
      data-week-day={dateKey}
      style={style}
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

function DayHead({ date }: { date: Date }) {
  const dow = DateU.dowMon(date);
  const isToday = DateU.isToday(date);
  return (
    <div
      className={cn(
        "flex items-baseline gap-[7px] border-b border-[var(--hair)] px-0.5 pb-2 pt-1",
        isToday && "border-[var(--accent)]",
      )}
    >
      <span
        className={cn(
          "text-xs font-medium text-[var(--ink-soft)]",
          dow === 6 && "text-[var(--accent)]",
          dow === 5 && "text-[var(--ink-faint)]",
          isToday && "font-bold text-[var(--accent)]",
        )}
      >
        {WEEKDAYS_JP[dow]}
      </span>
      <span
        className={cn(
          "font-[var(--num)] text-[19px] font-medium",
          isToday &&
            "inline-flex h-[27px] w-[27px] items-center justify-center rounded-full bg-[var(--accent)] text-sm text-white",
        )}
      >
        {date.getDate()}
      </span>
      {isToday && (
        <span className="h-[5px] w-[5px] rounded-full bg-[var(--accent)]" />
      )}
    </div>
  );
}

export function WeekView({ weekStart, ctx, layout, showWeekend }: Props) {
  const dayCount = showWeekend ? 7 : 5;
  const days = Array.from({ length: dayCount }, (_, i) =>
    DateU.addDays(weekStart, i),
  );

  const renderItems = (date: Date) => {
    const k = DateU.key(date);
    return dayItems(ctx.tasks, k).map((t) => (
      <TodoItem
        key={t.id}
        todo={t}
        onToggle={ctx.toggle}
        onRemove={ctx.remove}
        onEdit={ctx.edit}
        onMoveToInbox={(id) => ctx.moveTo(id, null)}
      />
    ));
  };

  // ----- A: equal columns -----
  if (layout === "columns") {
    return (
      <div
        className="grid h-full gap-0"
        style={{ gridTemplateColumns: `repeat(${dayCount},1fr)` }}
      >
        {days.map((date) => {
          const k = DateU.key(date);
          const dim = DateU.isPast(date);
          return (
            <DropZone
              key={k}
              dateKey={k}
              onMove={ctx.moveTo}
              className={cn(
                "flex min-h-0 min-w-0 flex-col border-l border-[var(--hair-soft)] px-3 transition-colors duration-150 first:border-l-0",
                DateU.isToday(date) &&
                  "bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]",
                dim && "bg-[var(--surface-2)]",
              )}
            >
              <DayHead date={date} />
              <div
                className={cn(
                  "flex min-h-0 flex-1 flex-col gap-[5px] overflow-y-auto pt-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[var(--hair)] [&::-webkit-scrollbar]:w-[7px]",
                  dim && "opacity-80",
                )}
              >
                {renderItems(date)}
                <AddInput onAdd={(text) => ctx.add(k, text)} />
              </div>
            </DropZone>
          );
        })}
      </div>
    );
  }

  // ----- B: today emphasized -----
  if (layout === "focus") {
    return (
      <div className="flex h-full gap-0">
        {days.map((date) => {
          const k = DateU.key(date);
          const today = DateU.isToday(date);
          const dim = DateU.isPast(date);
          return (
            <DropZone
              key={k}
              dateKey={k}
              onMove={ctx.moveTo}
              className={cn(
                "flex min-h-0 min-w-0 flex-[1_1_0] flex-col border-l border-[var(--hair-soft)] px-3 transition-colors duration-150 first:border-l-0",
                dim && "bg-[var(--surface-2)]",
                today &&
                  "mx-1 flex-[2.6_1_0] rounded-[9px] border-l-0 bg-[var(--surface)] shadow-[0_0_0_1px_var(--hair),0_8px_30px_-20px_rgba(40,30,20,0.35)]",
              )}
            >
              <DayHead date={date} />
              <div
                className={cn(
                  "flex min-h-0 flex-1 flex-col gap-[5px] overflow-y-auto pt-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[var(--hair)] [&::-webkit-scrollbar]:w-[7px]",
                  dim && "opacity-80",
                )}
              >
                {renderItems(date)}
                <AddInput
                  onAdd={(text) => ctx.add(k, text)}
                  placeholder={today ? "今日のタスクを追加" : "追加"}
                />
              </div>
            </DropZone>
          );
        })}
      </div>
    );
  }

  // ----- C: horizontal rows -----
  return (
    <div className="flex h-full flex-col overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[var(--hair)] [&::-webkit-scrollbar]:w-[7px]">
      {days.map((date) => {
        const k = DateU.key(date);
        const today = DateU.isToday(date);
        const dim = DateU.isPast(date);
        const st = dayStats(ctx.tasks, k);
        const dow = DateU.dowMon(date);
        return (
          <DropZone
            key={k}
            dateKey={k}
            onMove={ctx.moveTo}
            className={cn(
              "flex min-h-[54px] gap-[18px] border-b border-[var(--hair-soft)] px-1.5 py-[11px] transition-colors duration-150",
              dim && "bg-[var(--surface-2)]",
              today && "bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]",
            )}
          >
            <div className="flex w-24 flex-none items-baseline gap-2 pt-1">
              <span
                className={cn(
                  "text-[13px] font-medium text-[var(--ink-soft)]",
                  dow === 6 && "text-[var(--accent)]",
                )}
              >
                {WEEKDAYS_JP[dow]}
              </span>
              <span className="font-[var(--num)] text-[21px] font-medium">
                {date.getDate()}
              </span>
              {today && (
                <span className="self-center whitespace-nowrap rounded-full bg-[var(--accent)] px-1.5 py-px text-[10px] text-white">
                  今日
                </span>
              )}
              {st.total > 0 && (
                <span className="ml-auto self-center font-[var(--num)] text-[11px] text-[var(--ink-faint)]">
                  {st.done}/{st.total}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
              {renderItems(date)}
              <AddInput onAdd={(text) => ctx.add(k, text)} />
            </div>
          </DropZone>
        );
      })}
    </div>
  );
}
