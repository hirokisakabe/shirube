import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type Task,
	createTask,
	deleteTask,
	fetchTasks,
	updateTask,
} from "../api/tasks";
import { queryKeys } from "../query";

function sortForDay(items: Task[]): Task[] {
	return [...items].sort((a, b) => {
		if (!!a.doneAt !== !!b.doneAt) return a.doneAt ? 1 : -1;
		if (a.doneAt && b.doneAt) return a.doneAt.localeCompare(b.doneAt);
		return a.createdAt.localeCompare(b.createdAt);
	});
}

export function dayItems(todos: Task[], dateKey: string): Task[] {
	return sortForDay(todos.filter((t) => t.date === dateKey));
}

export function dayStats(todos: Task[], dateKey: string) {
	const items = todos.filter((t) => t.date === dateKey);
	return { total: items.length, done: items.filter((t) => t.doneAt).length };
}

export function useTasks() {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: queryKeys.tasks,
		queryFn: () => fetchTasks(),
	});
	const tasks = query.data ?? [];

	const setTasks = (updater: (previous: Task[]) => Task[]) => {
		queryClient.setQueryData<Task[]>(queryKeys.tasks, (previous = []) =>
			updater(previous),
		);
	};

	const updateMutation = useMutation({
		mutationFn: ({
			id,
			updates,
		}: {
			id: number;
			updates: { doneAt?: string | null; title?: string; date?: string };
		}) => updateTask(id, updates),
		onSuccess: (updated) => {
			setTasks((previous) =>
				previous.map((task) => (task.id === updated.id ? updated : task)),
			);
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
		},
	});

	const createMutation = useMutation({
		mutationFn: ({ title, date }: { title: string; date: string }) =>
			createTask(title, date),
		onSuccess: (task) => {
			setTasks((previous) => [...previous, task]);
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteTask,
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
		},
	});

	const add = (date: string, text: string) => {
		const clean = text.replace(/\s+/g, " ").trim();
		if (!clean) return;
		createMutation.mutate({ title: clean, date });
	};

	const toggle = (id: number) => {
		const task = tasks.find((t) => t.id === id);
		if (!task) return;
		const doneAt = task.doneAt ? null : new Date().toISOString();
		setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, doneAt } : t)));
		updateMutation.mutate(
			{ id, updates: { doneAt } },
			{
				onError: () => {
					setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
				},
			},
		);
	};

	const remove = (id: number) => {
		const task = tasks.find((t) => t.id === id);
		setTasks((prev) => prev.filter((t) => t.id !== id));
		deleteMutation.mutate(id, {
			onError: () => {
				if (task) setTasks((prev) => [...prev, task]);
			},
		});
	};

	const edit = (id: number, text: string) => {
		const clean = text.replace(/\s+/g, " ").trim();
		if (!clean) {
			remove(id);
			return;
		}
		const task = tasks.find((t) => t.id === id);
		setTasks((prev) =>
			prev.map((t) => (t.id === id ? { ...t, title: clean } : t)),
		);
		updateMutation.mutate(
			{ id, updates: { title: clean } },
			{
				onError: () => {
					if (task)
						setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
				},
			},
		);
	};

	const moveTo = (id: number, date: string) => {
		const task = tasks.find((t) => t.id === id);
		setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, date } : t)));
		updateMutation.mutate(
			{ id, updates: { date } },
			{
				onError: () => {
					if (task)
						setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
				},
			},
		);
	};

	return {
		tasks,
		loading: query.isLoading,
		error: query.error ? String(query.error) : null,
		add,
		toggle,
		remove,
		edit,
		moveTo,
	};
}
