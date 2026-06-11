import { useState } from "react";
import type { Task } from "../api/tasks";
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
    <div className="inbox-task">
      <TodoItem
        todo={task}
        onToggle={onToggle}
        onRemove={onRemove}
        onEdit={onEdit}
      />
      <div className="inbox-move">
        <input
          type="date"
          className="inbox-date"
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
          className="ui-button ui-button--compact inbox-move-btn"
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
      className={`inbox-panel${over ? " drop-over" : ""}`}
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
      <div className="inbox-head">
        <h2 className="inbox-title">Inbox</h2>
        <span className="inbox-count">{tasks.length}</span>
      </div>
      <div className="inbox-body">
        <AddInput onAdd={onAdd} placeholder="Inboxに追加" />
        {tasks.length === 0 ? (
          <p className="inbox-empty">日付未設定タスクはありません</p>
        ) : (
          <div className="inbox-list">
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
