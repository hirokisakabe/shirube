import type { InferResponseType } from "hono/client";
import { apiClient } from "./client";

type ReviewsGet = typeof apiClient.api.reviews.$get;
type ReviewByWeek = (typeof apiClient.api.reviews)[":week"];
type ReviewGet = ReviewByWeek["$get"];
type ReviewPut = ReviewByWeek["$put"];

export type Review = InferResponseType<ReviewsGet, 200>[number];

async function parseOrThrow<T>(res: Response, message: string): Promise<T> {
  if (!res.ok) throw new Error(`${message}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchReviews(): Promise<Review[]> {
  const res = await apiClient.api.reviews.$get();
  return parseOrThrow<InferResponseType<ReviewsGet, 200>>(
    res,
    "Failed to fetch reviews",
  );
}

export async function fetchReview(week: string): Promise<Review | null> {
  const res = await apiClient.api.reviews[":week"].$get({ param: { week } });
  if (res.status === 404) return null;
  return parseOrThrow<InferResponseType<ReviewGet, 200>>(
    res,
    "Failed to fetch review",
  );
}

export async function upsertReview(
  week: string,
  content: string,
): Promise<Review> {
  const res = await apiClient.api.reviews[":week"].$put({
    param: { week },
    json: { content },
  });
  return parseOrThrow<InferResponseType<ReviewPut, 200>>(
    res,
    "Failed to save review",
  );
}
