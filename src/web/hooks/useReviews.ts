import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
	type Review,
	fetchReview,
	fetchReviews,
	upsertReview,
} from "../api/reviews";
import { queryKeys } from "../query";

export function useReviews() {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: queryKeys.reviews,
		queryFn: fetchReviews,
	});

	const reload = useCallback(async () => {
		await queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
	}, [queryClient]);

	return {
		reviews: query.data ?? [],
		loading: query.isLoading,
		error: query.error ? String(query.error) : null,
		reload,
	};
}

export function useWeekReview(week: string) {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: queryKeys.review(week),
		queryFn: () => fetchReview(week),
	});

	const saveMutation = useMutation({
		mutationFn: (content: string) => upsertReview(week, content),
		onSuccess: (updated) => {
			queryClient.setQueryData(queryKeys.review(week), updated);
			queryClient.setQueryData<Review[]>(queryKeys.reviews, (previous = []) => {
				const withoutCurrent = previous.filter(
					(review) => review.week !== updated.week,
				);
				return [updated, ...withoutCurrent].sort((a, b) =>
					b.week.localeCompare(a.week),
				);
			});
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.review(week) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
		},
	});

	const save = useCallback(
		async (content: string) => {
			try {
				return await saveMutation.mutateAsync(content);
			} catch {
				return null;
			}
		},
		[saveMutation],
	);

	return {
		review: query.data ?? null,
		loading: query.isLoading,
		saving: saveMutation.isPending,
		error: query.error
			? String(query.error)
			: saveMutation.error
				? String(saveMutation.error)
				: null,
		save,
	};
}
