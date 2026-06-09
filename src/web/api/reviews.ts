import type { InferResponseType } from "hono/client";
import { apiClient } from "./client";

type ReviewsGet = typeof apiClient.api.reviews.$get;

export type Review = InferResponseType<ReviewsGet, 200>[number];

export async function fetchReviews() {
  const res = await apiClient.api.reviews.$get();
  if (!res.ok) throw new Error(`Failed to fetch reviews: ${res.status}`);
  return res.json();
}

export async function fetchReview(week: string) {
  const res = await apiClient.api.reviews[":week"].$get({ param: { week } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch review: ${res.status}`);
  return res.json();
}

export async function upsertReview(week: string, content: string) {
  const res = await apiClient.api.reviews[":week"].$put({
    param: { week },
    json: { content },
  });
  if (!res.ok) throw new Error(`Failed to save review: ${res.status}`);
  return res.json();
}
