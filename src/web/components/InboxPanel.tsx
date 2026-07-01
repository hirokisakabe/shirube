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
};

function InboxTask({
  task,
  onToggle,
  onRemove,
  onEdit,
  onMoveToDate,
}: {
  task: Task;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onEdit: (id: number, text: string) => void;
  onMoveToDate: (id: number, date: string | null) => void;
}) {
  const [date, setDate] = useState("");

  const move = () => {
    if (!date) return;
    onMoveToDate(task.id, date);
    setDate("");
  };

  return (
    <div className="flex flex-col gap-[5px]" data-inbox-task>
      <TodoItem
        todo={task}
        onToggle={onToggle}
        onRemove={onRemove}
        onEdit={onEdit}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 pl-[25px]">
        <input
          type="date"
          className={cn(ui.field, "h-[27px] px-1.5 font-[var(--num)] text-xs")}
          aria-label={`${task.title}の移動先日付`}
          value={date}
          onChange={(event) => setDate(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              move();
            }
          }}
        />
        <button
          type="button"
          className={cn(ui.button, ui.buttonCompact, "h-[27px]")}
          disabled={!date}
          onClick={move}
        >
          移動
        </button>
      </div>
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
}: Props) {
  const [over, setOver] = useState(false);

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col max-[860px]:border-b max-[860px]:border-[var(--hair)]",
        collapsed
          ? "items-center px-0 max-[860px]:min-w-0 max-[860px]:items-end max-[860px]:px-1 max-[860px]:py-0"
          : "pr-[18px] max-[860px]:pb-3 max-[860px]:pr-0",
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
          ui.panelHeader,
          "grid-cols-[36px_minmax(0,1fr)]",
          collapsed && ui.panelHeaderCollapsed,
        )}
      >
        <button
          type="button"
          className={ui.collapseButton}
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "日付未設定を開く" : "日付未設定を最小化"}
          title={collapsed ? "日付未設定を開く" : "日付未設定を最小化"}
        >
          <span className="h-px w-3.5 rounded-full bg-current" />
          <span className="h-px w-3.5 rounded-full bg-current" />
          <span className="h-px w-3.5 rounded-full bg-current" />
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <h2 className={ui.panelTitle}>日付未設定</h2>
            <span className={ui.countBadge}>{tasks.length}</span>
          </div>
        )}
      </div>
      {!collapsed && (
        <div className={cn(ui.panelScroller, "gap-2.5 pt-2")}>
          <AddInput onAdd={onAdd} placeholder="タスクを追加" />
          {tasks.length > 0 && (
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <InboxTask
                  key={task.id}
                  task={task}
                  onToggle={onToggle}
                  onRemove={onRemove}
                  onEdit={onEdit}
                  onMoveToDate={onMoveToDate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
