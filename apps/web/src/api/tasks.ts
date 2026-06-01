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
