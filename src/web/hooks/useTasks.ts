import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type Task,
  createTask,
  deleteTask,
  fetchTasks,
  updateTask,
} from "../api/tasks";
import { queryKeys } from "../query";

type TaskUpdate = { doneAt?: string | null; title?: string; date?: string };

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
      updates: TaskUpdate;
      optimistic: (task: Task) => Task;
    }) => updateTask(id, updates),
    onMutate: async ({ id, optimistic }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks });
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks);
      setTasks((current) =>
        current.map((task) => (task.id === id ? optimistic(task) : task)),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks, context.previous);
      }
    },
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks });
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks);
      setTasks((current) => current.filter((task) => task.id !== id));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks, context.previous);
      }
    },
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
    updateMutation.mutate({
      id,
      updates: { doneAt },
      optimistic: (current) => ({ ...current, doneAt }),
    });
  };

  const remove = (id: number) => {
    deleteMutation.mutate(id);
  };

  const edit = (id: number, text: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) {
      remove(id);
      return;
    }
    updateMutation.mutate({
      id,
      updates: { title: clean },
      optimistic: (current) => ({ ...current, title: clean }),
    });
  };

  const moveTo = (id: number, date: string) => {
    updateMutation.mutate({
      id,
      updates: { date },
      optimistic: (current) => ({ ...current, date }),
    });
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
