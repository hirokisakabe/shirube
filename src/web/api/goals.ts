import type { InferResponseType } from "hono/client";
import { apiClient } from "./client";

type GoalsGet = typeof apiClient.api.goals.$get;
type GoalsPost = typeof apiClient.api.goals.$post;
type GoalById = typeof apiClient.api.goals[":id"];
type GoalPatch = GoalById["$patch"];
type GoalDelete = GoalById["$delete"];

export type Goal = InferResponseType<GoalsGet, 200>[number];

async function parseOrThrow<T>(res: Response, message: string): Promise<T> {
	if (!res.ok) throw new Error(`${message}: ${res.status}`);
	return res.json() as Promise<T>;
}

export async function fetchGoals(includeAchieved = false): Promise<Goal[]> {
	const res = await apiClient.api.goals.$get({
		query: { all: includeAchieved ? "true" : undefined },
	});
	return parseOrThrow<InferResponseType<GoalsGet, 200>>(res, "Failed to fetch goals");
}

export async function createGoal(title: string): Promise<Goal> {
	const res = await apiClient.api.goals.$post({ json: { title } });
	return parseOrThrow<InferResponseType<GoalsPost, 201>>(res, "Failed to create goal");
}

export async function updateGoal(id: number, updates: { doneAt?: string | null }): Promise<Goal> {
	const res = await apiClient.api.goals[":id"].$patch({
		param: { id: String(id) },
		json: updates,
	});
	return parseOrThrow<InferResponseType<GoalPatch, 200>>(res, "Failed to update goal");
}

export async function deleteGoal(id: number): Promise<Goal> {
	const res = await apiClient.api.goals[":id"].$delete({ param: { id: String(id) } });
	return parseOrThrow<InferResponseType<GoalDelete, 200>>(res, "Failed to delete goal");
}
