import type { InferResponseType } from "hono/client";
import { apiClient } from "./client";

type TasksGet = typeof apiClient.api.tasks.$get;
type TasksPost = typeof apiClient.api.tasks.$post;
type TaskById = (typeof apiClient.api.tasks)[":id"];
type TaskPatch = TaskById["$patch"];
type TaskDelete = TaskById["$delete"];

export type Task = InferResponseType<TasksGet, 200>[number];

async function parseOrThrow<T>(res: Response, message: string): Promise<T> {
	if (!res.ok) throw new Error(`${message}: ${res.status}`);
	return res.json() as Promise<T>;
}

export async function fetchTasks(date?: string): Promise<Task[]> {
	const res = await apiClient.api.tasks.$get({ query: { date } });
	return parseOrThrow<InferResponseType<TasksGet, 200>>(
		res,
		"Failed to fetch tasks",
	);
}

export async function createTask(title: string, date: string): Promise<Task> {
	const res = await apiClient.api.tasks.$post({ json: { title, date } });
	return parseOrThrow<InferResponseType<TasksPost, 201>>(
		res,
		"Failed to create task",
	);
}

export async function updateTask(
	id: number,
	updates: { doneAt?: string | null; title?: string; date?: string },
): Promise<Task> {
	const res = await apiClient.api.tasks[":id"].$patch({
		param: { id: String(id) },
		json: updates,
	});
	return parseOrThrow<InferResponseType<TaskPatch, 200>>(
		res,
		"Failed to update task",
	);
}

export async function deleteTask(id: number): Promise<Task> {
	const res = await apiClient.api.tasks[":id"].$delete({
		param: { id: String(id) },
	});
	return parseOrThrow<InferResponseType<TaskDelete, 200>>(
		res,
		"Failed to delete task",
	);
}
