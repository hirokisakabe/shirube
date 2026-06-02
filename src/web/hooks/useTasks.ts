import { useCallback, useEffect, useRef, useState } from "react";
import { type Task, createTask, deleteTask, fetchTasks, updateTask } from "../api/tasks";

function sortForDay(items: Task[]): Task[] {
  return [...items].sort((a, b) => {
    if (!!a.doneAt !== !!b.doneAt) return a.doneAt ? 1 : -1;
    if (a.doneAt && b.doneAt) return a.doneAt.localeCompare(b.doneAt);
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function dayItems(todos: Task[], dateKey: string): Task[] {
  return sortForDay(todos.filter((t) => t.date === dateKey));
}

export function dayStats(todos: Task[], dateKey: string) {
  const items = todos.filter((t) => t.date === dateKey);
  return { total: items.length, done: items.filter((t) => t.doneAt).length };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const load = useCallback(async () => {
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const add = (date: string, text: string) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    createTask(clean, date).then((task) => {
      setTasks((prev) => [...prev, task]);
    }).catch(console.error);
  };

  const toggle = (id: number) => {
    const task = tasksRef.current.find((t) => t.id === id);
    if (!task) return;
    const doneAt = task.doneAt ? null : new Date().toISOString();
    // optimistic
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, doneAt } : t));
    updateTask(id, { doneAt }).then((updated) => {
      setTasks((prev) => prev.map((t) => t.id === id ? updated : t));
    }).catch(() => {
      setTasks((prev) => prev.map((t) => t.id === id ? task : t));
    });
  };

  const remove = (id: number) => {
    const task = tasksRef.current.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    deleteTask(id).catch(() => {
      if (task) setTasks((prev) => [...prev, task]);
    });
  };

  const edit = (id: number, text: string) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) { remove(id); return; }
    const task = tasksRef.current.find((t) => t.id === id);
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, title: clean } : t));
    updateTask(id, { title: clean }).then((updated) => {
      setTasks((prev) => prev.map((t) => t.id === id ? updated : t));
    }).catch(() => {
      if (task) setTasks((prev) => prev.map((t) => t.id === id ? task : t));
    });
  };

  const moveTo = (id: number, date: string) => {
    const task = tasksRef.current.find((t) => t.id === id);
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, date } : t));
    updateTask(id, { date }).then((updated) => {
      setTasks((prev) => prev.map((t) => t.id === id ? updated : t));
    }).catch(() => {
      if (task) setTasks((prev) => prev.map((t) => t.id === id ? task : t));
    });
  };

  return { tasks, loading, error, add, toggle, remove, edit, moveTo };
}
