import type { InferResponseType } from "hono/client";
import { apiClient } from "./client";

type GoalsGet = typeof apiClient.api.goals.$get;

export type Goal = InferResponseType<GoalsGet, 200>[number];

export async function fetchGoals(includeAchieved = false) {
  const res = await apiClient.api.goals.$get({
    query: { all: includeAchieved ? "true" : undefined },
  });
  if (!res.ok) throw new Error(`Failed to fetch goals: ${res.status}`);
  return res.json();
}

export async function createGoal(title: string) {
  const res = await apiClient.api.goals.$post({ json: { title } });
  if (!res.ok) throw new Error(`Failed to create goal: ${res.status}`);
  return res.json();
}

export async function updateGoal(
  id: number,
  updates: { doneAt?: string | null },
) {
  const res = await apiClient.api.goals[":id"].$patch({
    param: { id: String(id) },
    json: updates,
  });
  if (!res.ok) throw new Error(`Failed to update goal: ${res.status}`);
  return res.json();
}

export async function deleteGoal(id: number) {
  const res = await apiClient.api.goals[":id"].$delete({
    param: { id: String(id) },
  });
  if (!res.ok) throw new Error(`Failed to delete goal: ${res.status}`);
  return res.json();
}
