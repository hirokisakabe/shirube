import type { InferResponseType } from "hono/client";
import { apiClient } from "./client";
import {
  createIndexedDbTask,
  deleteIndexedDbTask,
  fetchIndexedDbTasks,
  updateIndexedDbTask,
} from "./indexeddb";
import { usesIndexedDbStorage } from "./storage";

type TasksGet = typeof apiClient.api.tasks.$get;

export type Task = InferResponseType<TasksGet, 200>[number];

export async function fetchTasks(date?: string) {
  if (usesIndexedDbStorage) return fetchIndexedDbTasks(date);
  const res = await apiClient.api.tasks.$get({ query: { date } });
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
  return res.json();
}

export async function createTask(title: string, date: string | null) {
  if (usesIndexedDbStorage) return createIndexedDbTask(title, date);
  const res = await apiClient.api.tasks.$post({ json: { title, date } });
  if (!res.ok) throw new Error(`Failed to create task: ${res.status}`);
  return res.json();
}

export async function updateTask(
  id: number,
  updates: {
    doneAt?: string | null;
    title?: string;
    date?: string | null;
    deletedAt?: null;
  },
) {
  if (usesIndexedDbStorage) return updateIndexedDbTask(id, updates);
  const res = await apiClient.api.tasks[":id"].$patch({
    param: { id: String(id) },
    json: updates,
  });
  if (!res.ok) throw new Error(`Failed to update task: ${res.status}`);
  return res.json();
}

export async function deleteTask(id: number) {
  if (usesIndexedDbStorage) return deleteIndexedDbTask(id);
  const res = await apiClient.api.tasks[":id"].$delete({
    param: { id: String(id) },
  });
  if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`);
  return res.json();
}
