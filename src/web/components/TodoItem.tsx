import { useEffect, useRef, useState } from "react";
import type { Task } from "../api/tasks";
import { isOptimisticTaskId } from "../hooks/useTasks";
import { cn, ui } from "../styles";
import { DateU, WEEKDAYS_JP } from "../utils/date";

type Props = {
  todo: Task;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onEdit: (id: number, text: string) => void;
  onMoveToDate?: (id: number, date: string | null) => void;
  showWeekend?: boolean;
  variant?: "default" | "compact";
};

const CALENDAR_WIDTH = 238;
const CALENDAR_HEIGHT = 282;

function CalendarIcon({ compact }: { compact: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={compact ? "h-3 w-3" : "h-3.5 w-3.5"}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    >
      <rect x="2.75" y="3.5" width="10.5" height="9.5" rx="1.5" />
      <path d="M5.25 2.25v2.5M10.75 2.25v2.5M2.75 6.25h10.5" />
    </svg>
  );
}

function DatePicker({
  currentDate,
  compact,
  showWeekend,
  onSelect,
  onClose,
}: {
  currentDate: string | null;
  compact: boolean;
  showWeekend: boolean;
  onSelect: (date: string | null) => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(() =>
    currentDate ? DateU.parse(currentDate) : DateU.today(),
  );
  const monthStart = DateU.startOfMonth(month);
  const gridStart = DateU.startOfWeek(monthStart);
  const heads = showWeekend ? WEEKDAYS_JP : WEEKDAYS_JP.slice(0, 5);
  const days = Array.from({ length: 42 }, (_, index) =>
    DateU.addDays(gridStart, index),
  ).filter((day) => showWeekend || DateU.dowMon(day) <= 4);

  const select = (date: string | null) => {
    onSelect(date);
    onClose();
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Popup body only stops task row/cell click propagation; interactive controls inside keep keyboard behavior.
    <div
      className={cn(
        "w-[238px] rounded-md border border-[var(--hair)] bg-[var(--surface)] p-2.5 text-[var(--ink)] shadow-[0_14px_40px_-24px_rgba(40,30,20,0.65)]",
        compact && "scale-[0.96]",
      )}
      data-date-picker
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className={cn(ui.taskActionButton, "h-6 w-6 text-sm")}
          aria-label="前の月"
          onClick={() =>
            setMonth(
              new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1),
            )
          }
        >
          ‹
        </button>
        <div className="font-[var(--num)] text-[13px] font-medium text-[var(--ink-soft)]">
          {DateU.fmtMonth(monthStart)}
        </div>
        <button
          type="button"
          className={cn(ui.taskActionButton, "h-6 w-6 text-sm")}
          aria-label="次の月"
          onClick={() =>
            setMonth(
              new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1),
            )
          }
        >
          ›
        </button>
      </div>
      <div
        className={cn(
          "grid gap-0.5",
          showWeekend ? "grid-cols-7" : "grid-cols-5",
        )}
      >
        {heads.map((weekday, index) => (
          <div
            key={weekday}
            className={cn(
              "h-5 text-center text-[10px] font-medium leading-5 text-[var(--ink-faint)]",
              index === 6 && "text-[var(--accent)]",
            )}
          >
            {weekday}
          </div>
        ))}
        {days.map((day) => {
          const key = DateU.key(day);
          const selected = currentDate === key;
          const today = DateU.isToday(day);
          const outside = day.getMonth() !== monthStart.getMonth();
          return (
            <button
              key={key}
              type="button"
              className={cn(
                "h-7 rounded-[4px] font-[var(--num)] text-[12px] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] hover:text-[var(--accent)]",
                outside && "text-[var(--ink-faint)]",
                today &&
                  "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_42%,transparent)]",
                selected &&
                  "bg-[var(--ink)] text-[var(--surface)] shadow-none hover:bg-[var(--ink)] hover:text-[var(--surface)]",
              )}
              aria-current={today ? "date" : undefined}
              aria-label={key}
              onClick={() => select(key)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={cn(
          "mt-2.5 flex h-7 w-full items-center justify-center rounded-md border border-[var(--hair)] bg-[var(--surface-2)] text-xs text-[var(--ink-soft)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-default disabled:opacity-45 disabled:hover:border-[var(--hair)] disabled:hover:text-[var(--ink-soft)]",
        )}
        disabled={currentDate === null}
        onClick={() => select(null)}
      >
        日付なしにする
      </button>
    </div>
  );
}

export function TodoItem({
  todo,
  onToggle,
  onRemove,
  onEdit,
  onMoveToDate,
  showWeekend = true,
  variant = "default",
}: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(todo.title);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ left: 0, top: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const pending = isOptimisticTaskId(todo.id);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const onDragStart = (e: React.DragEvent) => {
    if (pending) return;
    e.dataTransfer.setData("text/todo-id", String(todo.id));
    e.dataTransfer.effectAllowed = "move";
  };

  const commit = () => {
    onEdit(todo.id, val);
    setEditing(false);
  };

  const done = !!todo.doneAt;
  const compact = variant === "compact";
  const updateCalendarPosition = () => {
    const rect = dateButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxLeft = Math.max(10, window.innerWidth - CALENDAR_WIDTH - 10);
    const left = Math.min(maxLeft, Math.max(10, rect.right - CALENDAR_WIDTH));
    const hasRoomBelow =
      rect.bottom + CALENDAR_HEIGHT + 8 <= window.innerHeight;
    const top = hasRoomBelow
      ? rect.bottom + 6
      : Math.max(10, rect.top - CALENDAR_HEIGHT - 6);
    setCalendarPosition({ left, top });
  };

  useEffect(() => {
    if (!calendarOpen) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (dateButtonRef.current?.contains(target)) return;
      if (datePickerRef.current?.contains(target)) return;
      setCalendarOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCalendarOpen(false);
    };
    const reposition = () => updateCalendarPosition();

    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [calendarOpen]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- The wrapper prevents parent month-cell navigation; child buttons and edit input keep keyboard controls.
    <div
      className={cn(
        "group relative flex min-w-0 items-center rounded-md transition-[border-color,background,box-shadow] duration-150",
        compact
          ? "min-h-[18px] gap-[5px] border border-transparent bg-transparent px-0.5 py-px hover:bg-[color-mix(in_srgb,var(--surface)_74%,transparent)]"
          : "gap-2 border border-[var(--hair)] bg-[var(--surface)] px-[9px] py-1.5 hover:border-[var(--ink-faint)] hover:shadow-[0_1px_2px_rgba(40,30,20,0.05)]",
        !compact &&
          done &&
          "border-[var(--hair-soft)] bg-[var(--surface-2)] shadow-none",
        done && compact && "bg-transparent",
        pending && "cursor-wait opacity-65",
        !pending && !editing && "cursor-grab",
      )}
      aria-busy={pending}
      data-todo-done={done ? "true" : "false"}
      draggable={!editing && !pending}
      onDragStart={onDragStart}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={cn(
          "flex flex-none items-center justify-center rounded-full border-[1.5px] border-[var(--ink-faint)] transition-all duration-150 hover:border-[var(--accent)] disabled:cursor-wait disabled:hover:border-[var(--ink-faint)]",
          compact ? "h-3 w-3 border-[1.25px]" : "h-[17px] w-[17px]",
          done && "border-[var(--accent)] bg-[var(--accent)]",
        )}
        aria-label={done ? "未完了に戻す" : "完了にする"}
        disabled={pending}
        onClick={() => onToggle(todo.id)}
      >
        <span
          className={cn(
            "rounded-full bg-transparent transition-colors duration-150",
            compact ? "h-1.5 w-1.5" : "h-2 w-2",
            done && "scale-[0.85]",
          )}
        />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          className={cn(
            "min-w-0 flex-1 border-0 border-b border-[var(--accent)] bg-transparent p-0 text-sm outline-none",
            compact && "text-[11.5px] leading-[1.25]",
          )}
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/\n/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) commit();
            if (e.key === "Escape") {
              setVal(todo.title);
              setEditing(false);
            }
          }}
          onBlur={commit}
        />
      ) : (
        <span
          className={cn(
            "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm",
            compact && "text-[11.5px] leading-[1.25]",
            done &&
              "text-[var(--ink-faint)] line-through decoration-[var(--ink-faint)]",
          )}
          onDoubleClick={() => {
            if (pending) return;
            setVal(todo.title);
            setEditing(true);
          }}
          title={
            pending
              ? "保存中"
              : variant === "compact"
                ? todo.title
                : `${todo.title}\nダブルクリックで編集`
          }
        >
          {todo.title}
        </span>
      )}

      <span className="flex flex-none gap-px">
        {onMoveToDate && (
          <button
            ref={dateButtonRef}
            type="button"
            className={cn(
              ui.taskActionButton,
              compact ? "h-4 w-4 text-xs" : "h-5 w-5",
              calendarOpen
                ? "opacity-100"
                : "opacity-65 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
            )}
            data-task-action="pick-date"
            aria-label={`${todo.title}の予定日を${todo.date ? "変更" : "設定"}`}
            aria-expanded={calendarOpen}
            title={
              pending ? "保存中" : todo.date ? "予定日を変更" : "予定日を設定"
            }
            disabled={pending}
            onClick={() => {
              updateCalendarPosition();
              setCalendarOpen((value) => !value);
            }}
          >
            <CalendarIcon compact={compact} />
          </button>
        )}
        <button
          type="button"
          className={cn(
            ui.taskActionButton,
            compact ? "h-4 w-4 text-xs" : "h-5 w-5",
            "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
          )}
          data-task-action="remove"
          title={pending ? "保存中" : "削除"}
          disabled={pending}
          onClick={() => onRemove(todo.id)}
        >
          ×
        </button>
      </span>
      {calendarOpen && onMoveToDate && (
        <div
          ref={datePickerRef}
          className="fixed z-50 origin-top-right"
          style={{
            left: calendarPosition.left,
            top: calendarPosition.top,
          }}
        >
          <DatePicker
            currentDate={todo.date}
            compact={compact}
            showWeekend={showWeekend}
            onSelect={(date) => onMoveToDate(todo.id, date)}
            onClose={() => setCalendarOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
