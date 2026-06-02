import { useCallback, useEffect, useState } from "react";
import { type Review, fetchReview, fetchReviews, upsertReview } from "../api/reviews";

export function useReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchReviews();
      setReviews(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { reviews, loading, error, reload: load };
}

export function useWeekReview(week: string) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchReview(week)
      .then(setReview)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [week]);

  const save = useCallback(async (content: string) => {
    setSaving(true);
    try {
      const updated = await upsertReview(week, content);
      setReview(updated);
      return updated;
    } catch (e) {
      setError(String(e));
      return null;
    } finally {
      setSaving(false);
    }
  }, [week]);

  return { review, loading, saving, error, save };
}
