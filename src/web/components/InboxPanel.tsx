import { useState } from "react";
import type { Task } from "../api/tasks";
import { cn, ui } from "../styles";
import { AddInput } from "./AddInput";
import { TodoItem } from "./TodoItem";

type Props = {
  tasks: Task[];
  collapsed: boolean;
  onAdd: (text: string) => void;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onEdit: (id: number, text: string) => void;
  onMoveToDate: (id: number, date: string | null) => void;
  onToggleCollapsed: () => void;
  showWeekend: boolean;
  showToggle?: boolean;
};

function InboxTask({
  task,
  onToggle,
  onRemove,
  onEdit,
  onMoveToDate,
  showWeekend,
}: {
  task: Task;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onEdit: (id: number, text: string) => void;
  onMoveToDate: (id: number, date: string | null) => void;
  showWeekend: boolean;
}) {
  return (
    <div data-inbox-task>
      <TodoItem
        todo={task}
        onToggle={onToggle}
        onRemove={onRemove}
        onEdit={onEdit}
        onMoveToDate={onMoveToDate}
        showWeekend={showWeekend}
      />
    </div>
  );
}

export function InboxPanel({
  tasks,
  collapsed,
  onAdd,
  onToggle,
  onRemove,
  onEdit,
  onMoveToDate,
  onToggleCollapsed,
  showWeekend,
  showToggle = true,
}: Props) {
  const [over, setOver] = useState(false);
  const openTaskCount = tasks.filter((task) => !task.doneAt).length;

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col max-[860px]:border-b max-[860px]:border-[var(--hair)]",
        collapsed
          ? "items-center px-0 max-[860px]:min-w-0 max-[860px]:items-end max-[860px]:px-1 max-[860px]:py-0"
          : showToggle
            ? "pr-[18px] max-[860px]:pb-3 max-[860px]:pr-0"
            : "max-[860px]:pb-3",
        over && "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]",
      )}
      aria-label="日付未設定"
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const id = Number(event.dataTransfer.getData("text/todo-id"));
        if (id) onMoveToDate(id, null);
      }}
    >
      <div
        className={cn(
          showToggle
            ? ui.panelHeader
            : "grid h-[33px] items-center border-b border-[var(--hair-soft)] px-0.5",
          showToggle
            ? "grid-cols-[36px_minmax(0,1fr)]"
            : "grid-cols-[minmax(0,1fr)]",
          collapsed && ui.panelHeaderCollapsed,
        )}
      >
        {showToggle && (
          <button
            type="button"
            className={cn(ui.collapseButton, "relative")}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "日付未設定を開く" : "日付未設定を最小化"}
            title={collapsed ? "日付未設定を開く" : "日付未設定を最小化"}
          >
            {collapsed ? (
              <>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 18 18"
                  className="h-[17px] w-[17px]"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.45"
                >
                  <path d="M3 7.25 4.6 4h8.8L15 7.25v6.25H3V7.25Z" />
                  <path d="M3 8h3.25l1 1.75h3.5l1-1.75H15" />
                </svg>
                {openTaskCount > 0 && (
                  <span
                    className="accent-fill absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 font-[var(--num)] text-[9px] font-medium leading-none text-white ring-2 ring-[var(--paper)]"
                    aria-hidden="true"
                    data-inbox-count
                  >
                    {openTaskCount}
                  </span>
                )}
              </>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
              >
                <path d="M10 3.5 5.5 8l4.5 4.5" />
              </svg>
            )}
          </button>
        )}
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <h2 className={ui.panelTitle}>日付未設定</h2>
            <span className={ui.countBadge} data-inbox-count>
              {openTaskCount}
            </span>
          </div>
        )}
      </div>
      {!collapsed && (
        <div className={cn(ui.panelScroller, "gap-[5px] pt-3")}>
          {tasks.length > 0 && (
            <div className="flex flex-col gap-[5px]">
              {tasks.map((task) => (
                <InboxTask
                  key={task.id}
                  task={task}
                  onToggle={onToggle}
                  onRemove={onRemove}
                  onEdit={onEdit}
                  onMoveToDate={onMoveToDate}
                  showWeekend={showWeekend}
                />
              ))}
            </div>
          )}
          <AddInput onAdd={onAdd} placeholder="タスクを追加" />
        </div>
      )}
    </aside>
  );
}
