export type Task = {
  id: number;
  title: string;
  date: string;
  doneAt: string | null;
  deletedAt: string | null;
  createdAt: string;
};

export async function fetchTasks(date?: string): Promise<Task[]> {
  const url = new URL("/api/tasks", location.origin);
  if (date) url.searchParams.set("date", date);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
  return res.json() as Promise<Task[]>;
}

export async function createTask(title: string, date: string): Promise<Task> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, date }),
  });
  if (!res.ok) throw new Error(`Failed to create task: ${res.status}`);
  return res.json() as Promise<Task>;
}
