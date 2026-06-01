import { useEffect, useState } from "react";
import { type Task, createTask, fetchTasks } from "../api/tasks";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function getWeekDates(base: Date): Date[] {
  const dow = base.getDay(); // 0=Sun, CLI と同じ日曜始まり
  const sunday = new Date(base);
  sunday.setDate(base.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CalendarPage() {
  const [today] = useState(() => new Date());
  const weekDates = getWeekDates(today);
  const todayStr = toDateStr(today);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTasks()
      .then(setTasks)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(date: string) {
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      const created = await createTask(newTitle.trim(), date);
      setTasks((prev) => [...prev, created]);
      setNewTitle("");
      setActiveDate(null);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p>エラー: {error}</p>;

  return (
    <main>
      <h1>カレンダー</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "8px",
        }}
      >
        {weekDates.map((d, i) => {
          const dateStr = toDateStr(d);
          const dayTasks = tasks.filter((t) => t.date === dateStr);
          const isToday = dateStr === todayStr;
          return (
            <div
              key={dateStr}
              style={{
                border: isToday ? "2px solid #333" : "1px solid #ccc",
                borderRadius: "4px",
                padding: "8px",
                minHeight: "140px",
              }}
            >
              <button
                onClick={() => {
                  setActiveDate(activeDate === dateStr ? null : dateStr);
                  setNewTitle("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: isToday ? "bold" : "normal",
                  padding: 0,
                  fontSize: "inherit",
                }}
              >
                {d.getMonth() + 1}/{d.getDate()} ({WEEKDAYS[i]})
              </button>
              <ul style={{ listStyle: "none", padding: 0, margin: "4px 0" }}>
                {dayTasks.map((task) => (
                  <li
                    key={task.id}
                    data-done={task.doneAt !== null}
                    style={{
                      textDecoration: task.doneAt ? "line-through" : "none",
                      color: task.doneAt ? "#999" : "inherit",
                      fontSize: "0.85em",
                    }}
                  >
                    {task.title}
                  </li>
                ))}
              </ul>
              {activeDate === dateStr && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSubmit(dateStr);
                  }}
                >
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="タスク名"
                    autoFocus
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                  <button type="submit" disabled={submitting}>
                    追加
                  </button>
                  <button type="button" onClick={() => setActiveDate(null)}>
                    キャンセル
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
