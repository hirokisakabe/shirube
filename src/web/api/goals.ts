export type Goal = {
  id: number;
  title: string;
  doneAt: string | null;
  deletedAt: string | null;
  createdAt: string;
};

export async function fetchGoals(includeAchieved = false): Promise<Goal[]> {
  const url = new URL("/api/goals", location.origin);
  if (includeAchieved) url.searchParams.set("all", "true");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch goals: ${res.status}`);
  return res.json() as Promise<Goal[]>;
}

export async function createGoal(title: string): Promise<Goal> {
  const res = await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to create goal: ${res.status}`);
  return res.json() as Promise<Goal>;
}

export async function updateGoal(id: number, updates: { doneAt?: string | null }): Promise<Goal> {
  const res = await fetch(`/api/goals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update goal: ${res.status}`);
  return res.json() as Promise<Goal>;
}

export async function deleteGoal(id: number): Promise<Goal> {
  const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete goal: ${res.status}`);
  return res.json() as Promise<Goal>;
}
