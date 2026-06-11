import { useState } from "react";
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

let nextOptimisticTaskId = -1;

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
  const [operationError, setOperationError] = useState<string | null>(null);
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

  const showOperationError = () => {
    setOperationError("タスク操作に失敗しました。変更を元に戻しました。");
  };

  const restoreTaskFromSnapshot = (snapshot: Task[], id: number) => {
    const snapshotTask = snapshot.find((task) => task.id === id);
    if (!snapshotTask) {
      queryClient.setQueryData(queryKeys.tasks, snapshot);
      showOperationError();
      return;
    }

    queryClient.setQueryData<Task[]>(queryKeys.tasks, (current = []) => {
      if (current.some((task) => task.id === id)) {
        return current.map((task) => (task.id === id ? snapshotTask : task));
      }

      const snapshotIds = new Set(snapshot.map((task) => task.id));
      const restored = snapshot.flatMap((snapshotItem) => {
        if (snapshotItem.id === id) return [snapshotTask];
        const currentItem = current.find((task) => task.id === snapshotItem.id);
        return currentItem ? [currentItem] : [];
      });
      const currentOnly = current.filter((task) => !snapshotIds.has(task.id));
      return [...restored, ...currentOnly];
    });
    showOperationError();
  };

  const removeOptimisticTask = (id: number) => {
    setTasks((current) => current.filter((task) => task.id !== id));
    showOperationError();
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
      setOperationError(null);
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks });
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks) ?? [];
      setTasks((current) =>
        current.map((task) => (task.id === id ? optimistic(task) : task)),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        restoreTaskFromSnapshot(context.previous, _variables.id);
      } else {
        showOperationError();
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
    onMutate: async ({ title, date }) => {
      setOperationError(null);
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks });
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks) ?? [];
      const tempId = nextOptimisticTaskId--;
      const optimisticTask: Task = {
        id: tempId,
        title,
        date,
        doneAt: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
      };
      setTasks((current) => [...current, optimisticTask]);
      return { previous, tempId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        removeOptimisticTask(context.tempId);
      } else {
        showOperationError();
      }
    },
    onSuccess: (task, _variables, context) => {
      setTasks((previous) => {
        if (previous.some((item) => item.id === task.id)) {
          return previous.map((item) => (item.id === task.id ? task : item));
        }
        let replacedTempTask = false;
        const next = previous.map((item) => {
          if (item.id !== context.tempId) return item;
          replacedTempTask = true;
          return task;
        });
        return replacedTempTask ? next : [...next, task];
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onMutate: async (id) => {
      setOperationError(null);
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks });
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks) ?? [];
      setTasks((current) => current.filter((task) => task.id !== id));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        restoreTaskFromSnapshot(context.previous, _variables);
      } else {
        showOperationError();
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });

  const isOptimisticTask = (id: number) => id < 0;

  const add = (date: string, text: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return;
    createMutation.mutate({ title: clean, date });
  };

  const toggle = (id: number) => {
    if (isOptimisticTask(id)) return;
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
    if (isOptimisticTask(id)) return;
    deleteMutation.mutate(id);
  };

  const edit = (id: number, text: string) => {
    if (isOptimisticTask(id)) return;
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
    if (isOptimisticTask(id)) return;
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
    operationError,
    add,
    toggle,
    remove,
    edit,
    moveTo,
  };
}
