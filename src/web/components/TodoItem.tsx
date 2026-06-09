import { useEffect, useRef, useState } from "react";
import type { Task } from "../api/tasks";

type Props = {
  todo: Task;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onEdit: (id: number, text: string) => void;
  variant?: "default" | "compact";
};

export function TodoItem({
  todo,
  onToggle,
  onRemove,
  onEdit,
  variant = "default",
}: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/todo-id", String(todo.id));
    e.dataTransfer.effectAllowed = "move";
  };

  const commit = () => {
    onEdit(todo.id, val);
    setEditing(false);
  };

  const done = !!todo.doneAt;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- The wrapper prevents parent month-cell navigation; child buttons and edit input keep keyboard controls.
    <div
      className={`todo${variant === "compact" ? " todo-compact" : ""}${done ? " done" : ""}`}
      data-todo-done={done ? "true" : "false"}
      draggable={!editing}
      onDragStart={onDragStart}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="check"
        aria-label={done ? "未完了に戻す" : "完了にする"}
        onClick={() => onToggle(todo.id)}
      >
        <span className="check-mark" />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          className="todo-edit"
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
          className="todo-text"
          onDoubleClick={() => {
            setVal(todo.title);
            setEditing(true);
          }}
          title={
            variant === "compact"
              ? todo.title
              : `${todo.title}\nダブルクリックで編集`
          }
        >
          {todo.title}
        </span>
      )}

      <span className="todo-actions">
        <button
          type="button"
          className="act"
          title="削除"
          onClick={() => onRemove(todo.id)}
        >
          ×
        </button>
      </span>
    </div>
  );
}
