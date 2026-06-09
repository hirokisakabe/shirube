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

function sortGoals(goals: Goal[]) {
	return [...goals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function upsertGoal(goals: Goal[], goal: Goal) {
	return sortGoals([goal, ...goals.filter((item) => item.id !== goal.id)]);
}

export function useGoals() {
	const [showAchieved, setShowAchieved] = useState(false);
	const queryClient = useQueryClient();
	const queryKey = queryKeys.goals(showAchieved);
	const query = useQuery({ queryKey, queryFn: () => fetchGoals(showAchieved) });
	const goals = query.data ?? [];

	const setGoalQuery = (
		showDone: boolean,
		updater: (previous: Goal[]) => Goal[],
	) => {
		queryClient.setQueryData<Goal[] | undefined>(
			queryKeys.goals(showDone),
			(previous) => (previous ? updater(previous) : previous),
		);
	};

	const setCurrentGoals = (updater: (previous: Goal[]) => Goal[]) => {
		queryClient.setQueryData<Goal[]>(queryKey, (previous = []) =>
			updater(previous),
		);
	};

	const setGoalQueries = (
		updater: (previous: Goal[], showDone: boolean) => Goal[],
	) => {
		setGoalQuery(false, (previous) => updater(previous, false));
		setGoalQuery(true, (previous) => updater(previous, true));
	};

	const invalidateGoals = () => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.goalsRoot });
	};

	const createMutation = useMutation({
		mutationFn: createGoal,
		onSuccess: (goal) => {
			setCurrentGoals((previous) => upsertGoal(previous, goal));
			setGoalQuery(!showAchieved, (previous) => upsertGoal(previous, goal));
		},
		onSettled: invalidateGoals,
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, doneAt }: { id: number; doneAt: string | null }) =>
			updateGoal(id, { doneAt }),
		onMutate: async ({ id, doneAt }) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.goalsRoot });
			const previousOpen = queryClient.getQueryData<Goal[]>(
				queryKeys.goals(false),
			);
			const previousAll = queryClient.getQueryData<Goal[]>(
				queryKeys.goals(true),
			);
			const currentGoal = [
				...(previousOpen ?? []),
				...(previousAll ?? []),
			].find((goal) => goal.id === id);
			if (currentGoal) {
				const optimistic = { ...currentGoal, doneAt };
				setGoalQueries((previous, showDone) => {
					if (!showDone && optimistic.doneAt) {
						return previous.filter((goal) => goal.id !== id);
					}
					if (!showDone) return upsertGoal(previous, optimistic);
					return previous.map((goal) => (goal.id === id ? optimistic : goal));
				});
			}
			return { previousOpen, previousAll };
		},
		onError: (_error, _variables, context) => {
			if (context?.previousOpen) {
				queryClient.setQueryData(queryKeys.goals(false), context.previousOpen);
			}
			if (context?.previousAll) {
				queryClient.setQueryData(queryKeys.goals(true), context.previousAll);
			}
		},
		onSuccess: (updated, { id, doneAt }) => {
			const becomingDone = !!doneAt;
			setGoalQueries((previous, showDone) => {
				if (becomingDone && !showDone)
					return previous.filter((goal) => goal.id !== id);
				if (!showDone) return upsertGoal(previous, updated);
				return previous.map((goal) => (goal.id === id ? updated : goal));
			});
		},
		onSettled: invalidateGoals,
	});

	const deleteMutation = useMutation({
		mutationFn: deleteGoal,
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.goalsRoot });
			const previousOpen = queryClient.getQueryData<Goal[]>(
				queryKeys.goals(false),
			);
			const previousAll = queryClient.getQueryData<Goal[]>(
				queryKeys.goals(true),
			);
			setGoalQueries((previous) => previous.filter((goal) => goal.id !== id));
			return { previousOpen, previousAll };
		},
		onError: (_error, _variables, context) => {
			if (context?.previousOpen) {
				queryClient.setQueryData(queryKeys.goals(false), context.previousOpen);
			}
			if (context?.previousAll) {
				queryClient.setQueryData(queryKeys.goals(true), context.previousAll);
			}
		},
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
		const doneAt = goal.doneAt ? null : new Date().toISOString();
		updateMutation.mutate({ id, doneAt });
	};

	const remove = (id: number) => {
		deleteMutation.mutate(id);
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
