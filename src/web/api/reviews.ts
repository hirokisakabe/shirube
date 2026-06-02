export type Review = {
  id: number;
  week: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchReviews(): Promise<Review[]> {
  const res = await fetch("/api/reviews");
  if (!res.ok) throw new Error(`Failed to fetch reviews: ${res.status}`);
  return res.json() as Promise<Review[]>;
}

export async function fetchReview(week: string): Promise<Review | null> {
  const res = await fetch(`/api/reviews/${encodeURIComponent(week)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch review: ${res.status}`);
  return res.json() as Promise<Review>;
}

export async function upsertReview(week: string, content: string): Promise<Review> {
  const res = await fetch(`/api/reviews/${encodeURIComponent(week)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Failed to save review: ${res.status}`);
  return res.json() as Promise<Review>;
}
