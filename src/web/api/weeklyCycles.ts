import type { InferResponseType } from "hono/client";
import { apiClient } from "./client";
import {
  fetchIndexedDbWeeklyCycle,
  fetchIndexedDbWeeklyCycles,
  upsertIndexedDbWeeklyCycle,
} from "./indexeddb";
import { usesIndexedDbStorage } from "./storage";

type WeeklyCyclesGet = (typeof apiClient.api)["weekly-cycles"]["$get"];

export type WeeklyCycle = InferResponseType<WeeklyCyclesGet, 200>[number];

export async function fetchWeeklyCycles() {
  if (usesIndexedDbStorage) return fetchIndexedDbWeeklyCycles();
  const res = await apiClient.api["weekly-cycles"].$get();
  if (!res.ok) throw new Error(`Failed to fetch weekly cycles: ${res.status}`);
  return res.json();
}

export async function fetchWeeklyCycle(week: string) {
  if (usesIndexedDbStorage) return fetchIndexedDbWeeklyCycle(week);
  const res = await apiClient.api["weekly-cycles"][":week"].$get({
    param: { week },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch weekly cycle: ${res.status}`);
  return res.json();
}

export async function upsertWeeklyCycle(
  week: string,
  content: { goalContent: string; reviewContent: string },
) {
  if (usesIndexedDbStorage) return upsertIndexedDbWeeklyCycle(week, content);
  const res = await apiClient.api["weekly-cycles"][":week"].$put({
    param: { week },
    json: content,
  });
  if (!res.ok) throw new Error(`Failed to save weekly cycle: ${res.status}`);
  return res.json();
}
