import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	type Goal,
	createGoal,
	deleteGoal,
	fetchGoals,
	updateGoal,
} from "../api/goals";
import { queryKeys } from "../query";

export function useGoals() {
	const [showAchieved, setShowAchieved] = useState(false);
	const queryClient = useQueryClient();
	const queryKey = queryKeys.goals(showAchieved);
	const query = useQuery({ queryKey, queryFn: () => fetchGoals(showAchieved) });
	const goals = query.data ?? [];

	const setCurrentGoals = (updater: (previous: Goal[]) => Goal[]) => {
		queryClient.setQueryData<Goal[]>(queryKey, (previous = []) =>
			updater(previous),
		);
	};

	const invalidateGoals = () => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.goalsRoot });
	};

	const createMutation = useMutation({
		mutationFn: createGoal,
		onSuccess: (goal) => {
			setCurrentGoals((previous) => [goal, ...previous]);
		},
		onSettled: invalidateGoals,
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, doneAt }: { id: number; doneAt: string | null }) =>
			updateGoal(id, { doneAt }),
		onSuccess: (updated, { id, doneAt }) => {
			const becomingDone = !!doneAt;
			setCurrentGoals((previous) => {
				if (becomingDone && !showAchieved)
					return previous.filter((goal) => goal.id !== id);
				return previous.map((goal) => (goal.id === id ? updated : goal));
			});
		},
		onSettled: invalidateGoals,
	});

	const deleteMutation = useMutation({
		mutationFn: deleteGoal,
		onSettled: invalidateGoals,
	});

	const toggleShowAchieved = () => setShowAchieved((value) => !value);

	const add = (text: string) => {
		const clean = text.replace(/\s+/g, " ").trim();
		if (!clean) return;
		createMutation.mutate(clean);
	};

	const toggle = (id: number) => {
		const goal = goals.find((item) => item.id === id);
		if (!goal) return;
		const becomingDone = !goal.doneAt;
		const doneAt = becomingDone ? new Date().toISOString() : null;
		if (becomingDone && !showAchieved) {
			setCurrentGoals((previous) => previous.filter((item) => item.id !== id));
		} else {
			setCurrentGoals((previous) =>
				previous.map((item) => (item.id === id ? { ...item, doneAt } : item)),
			);
		}
		updateMutation.mutate(
			{ id, doneAt },
			{
				onError: () => {
					if (becomingDone && !showAchieved) {
						setCurrentGoals((previous) => [goal, ...previous]);
					} else {
						setCurrentGoals((previous) =>
							previous.map((item) => (item.id === id ? goal : item)),
						);
					}
				},
			},
		);
	};

	const remove = (id: number) => {
		const goal = goals.find((item) => item.id === id);
		setCurrentGoals((previous) => previous.filter((item) => item.id !== id));
		deleteMutation.mutate(id, {
			onError: () => {
				if (goal) setCurrentGoals((previous) => [goal, ...previous]);
			},
		});
	};

	return {
		goals,
		loading: query.isLoading,
		error: query.error ? String(query.error) : null,
		showAchieved,
		toggleShowAchieved,
		add,
		toggle,
		remove,
	};
}
