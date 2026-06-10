import type { InferResponseType } from "hono/client";
import { apiClient } from "./client";
import {
  fetchIndexedDbReview,
  fetchIndexedDbReviews,
  upsertIndexedDbReview,
} from "./indexeddb";
import { usesIndexedDbStorage } from "./storage";

type ReviewsGet = typeof apiClient.api.reviews.$get;

export type Review = InferResponseType<ReviewsGet, 200>[number];

export async function fetchReviews() {
  if (usesIndexedDbStorage) return fetchIndexedDbReviews();
  const res = await apiClient.api.reviews.$get();
  if (!res.ok) throw new Error(`Failed to fetch reviews: ${res.status}`);
  return res.json();
}

export async function fetchReview(week: string) {
  if (usesIndexedDbStorage) return fetchIndexedDbReview(week);
  const res = await apiClient.api.reviews[":week"].$get({ param: { week } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch review: ${res.status}`);
  return res.json();
}

export async function upsertReview(week: string, content: string) {
  if (usesIndexedDbStorage) return upsertIndexedDbReview(week, content);
  const res = await apiClient.api.reviews[":week"].$put({
    param: { week },
    json: { content },
  });
  if (!res.ok) throw new Error(`Failed to save review: ${res.status}`);
  return res.json();
}
