import { useEffect, useRef, useState } from "react";
import type { Task } from "../api/tasks";
import { isOptimisticTaskId } from "../hooks/useTasks";
import { cn } from "../styles";

type Props = {
  todo: Task;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onEdit: (id: number, text: string) => void;
  onMoveToInbox?: (id: number) => void;
  variant?: "default" | "compact";
};

export function TodoItem({
  todo,
  onToggle,
  onRemove,
  onEdit,
  onMoveToInbox,
  variant = "default",
}: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);
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
            done && "scale-[0.85] bg-white",
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

      <span className="flex flex-none gap-px opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {onMoveToInbox && todo.date !== null && (
          <button
            type="button"
            className={cn(
              "flex items-center justify-center rounded text-[15px] text-[var(--ink-faint)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] hover:text-[var(--accent)] disabled:cursor-wait disabled:hover:bg-transparent disabled:hover:text-[var(--ink-faint)]",
              compact ? "h-4 w-4 text-xs" : "h-5 w-5",
            )}
            data-task-action="move-to-inbox"
            title={pending ? "保存中" : "Inboxへ戻す"}
            disabled={pending}
            onClick={() => onMoveToInbox(todo.id)}
          >
            ↩
          </button>
        )}
        <button
          type="button"
          className={cn(
            "flex items-center justify-center rounded text-[15px] text-[var(--ink-faint)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] hover:text-[var(--accent)] disabled:cursor-wait disabled:hover:bg-transparent disabled:hover:text-[var(--ink-faint)]",
            compact ? "h-4 w-4 text-xs" : "h-5 w-5",
          )}
          data-task-action="remove"
          title={pending ? "保存中" : "削除"}
          disabled={pending}
          onClick={() => onRemove(todo.id)}
        >
          ×
        </button>
      </span>
    </div>
  );
}
