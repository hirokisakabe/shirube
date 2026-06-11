import { useState } from "react";
import type { Task } from "../api/tasks";
import { cn, ui } from "../styles";
import { AddInput } from "./AddInput";
import { TodoItem } from "./TodoItem";

type Props = {
  tasks: Task[];
  onAdd: (text: string) => void;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onEdit: (id: number, text: string) => void;
  onMoveToDate: (id: number, date: string | null) => void;
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
  onAdd,
  onToggle,
  onRemove,
  onEdit,
  onMoveToDate,
}: Props) {
  const [over, setOver] = useState(false);

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col border-r border-[var(--hair)] pr-[18px] transition-colors duration-150 max-[860px]:border-b max-[860px]:border-r-0 max-[860px]:pb-3 max-[860px]:pr-0",
        over && "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]",
      )}
      aria-label="Inbox"
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
      <div className="flex items-center justify-between gap-2.5 border-b border-[var(--hair)] px-0.5 pb-[9px] pt-[3px]">
        <h2 className="m-0 text-[15px] font-bold tracking-normal">Inbox</h2>
        <span className="inline-flex h-[22px] min-w-6 items-center justify-center rounded-full border border-[var(--hair)] font-[var(--num)] text-xs text-[var(--ink-soft)]">
          {tasks.length}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pt-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[var(--hair)] [&::-webkit-scrollbar]:w-[7px]">
        <AddInput onAdd={onAdd} placeholder="Inboxに追加" />
        {tasks.length === 0 ? (
          <p className="m-0 mt-1 text-[13px] text-[var(--ink-faint)]">
            日付未設定タスクはありません
          </p>
        ) : (
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
    </aside>
  );
}
