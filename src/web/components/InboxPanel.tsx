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
          className="h-[27px] min-w-0 rounded-md border border-[var(--hair)] bg-[var(--surface)] px-1.5 font-[var(--num)] text-xs text-[var(--ink)] outline-none focus:border-[var(--ink-faint)]"
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
          "grid h-[40px] grid-cols-[36px_minmax(0,1fr)] items-center border-b border-[var(--hair)] px-0.5 pb-2 pt-1",
          collapsed &&
            "flex w-full justify-center border-b-0 px-0 pb-0 pt-1 max-[860px]:justify-end",
        )}
      >
        <button
          type="button"
          className="flex h-[30px] w-[30px] flex-none flex-col items-center justify-center justify-self-center gap-[3px] rounded-md text-[var(--ink-soft)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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
            <h2 className="m-0 text-[13px] font-medium tracking-normal text-[var(--ink-soft)]">
              日付未設定
            </h2>
            <span className="inline-flex h-[22px] min-w-6 items-center justify-center rounded-full border border-[var(--hair)] px-1 font-[var(--num)] text-xs text-[var(--ink-soft)]">
              {tasks.length}
            </span>
          </div>
        )}
      </div>
      {!collapsed && (
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pt-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[var(--hair)] [&::-webkit-scrollbar]:w-[7px]">
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
