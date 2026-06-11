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

type TaskUpdate = {
  doneAt?: string | null;
  title?: string;
  date?: string;
  deletedAt?: string | null;
};

type UndoAction = {
  message: string;
  run: () => Promise<void>;
};

const taskMutationKey = ["tasks", "mutation"] as const;
let nextOptimisticTaskId = -1;

export function isOptimisticTaskId(id: number) {
  return id < 0;
}

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
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [undoing, setUndoing] = useState(false);
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

  const showUndoError = () => {
    setOperationError("Undoに失敗しました。最新の状態に戻しました。");
  };

  const restoreTaskFromSnapshot = (snapshot: Task[], id: number) => {
    const snapshotTask = snapshot.find((task) => task.id === id);
    if (!snapshotTask) {
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

  const invalidateTasksWhenSettled = () => {
    if (queryClient.isMutating({ mutationKey: taskMutationKey }) === 1) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    }
  };

  const replaceTask = (task: Task) => {
    setTasks((current) => {
      if (current.some((item) => item.id === task.id)) {
        return current.map((item) => (item.id === task.id ? task : item));
      }
      return [...current, task];
    });
  };

  const createUpdateUndo = (
    previousTask: Task,
    updatedTask: Task,
    message: string,
  ): UndoAction => ({
    message,
    run: async () => {
      const currentBeforeUndo =
        queryClient
          .getQueryData<Task[]>(queryKeys.tasks)
          ?.find((task) => task.id === updatedTask.id) ?? updatedTask;
      replaceTask(previousTask);
      try {
        const restored = await updateTask(previousTask.id, {
          title: previousTask.title,
          date: previousTask.date,
          doneAt: previousTask.doneAt,
        });
        replaceTask(restored);
        setOperationError(null);
        void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      } catch {
        replaceTask(currentBeforeUndo);
        showUndoError();
        void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
        throw new Error("Failed to undo task update");
      }
    },
  });

  const updateMutation = useMutation({
    mutationKey: taskMutationKey,
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
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks) ?? [];
      setTasks((current) =>
        current.map((task) => (task.id === id ? optimistic(task) : task)),
      );
      return { previous };
    },
    onError: (_error, variables, context) => {
      if (context) {
        restoreTaskFromSnapshot(context.previous, variables.id);
      } else {
        showOperationError();
      }
    },
    onSuccess: (updated, variables, context) => {
      setOperationError(null);
      const previousTask = context?.previous.find(
        (task) => task.id === variables.id,
      );
      if (previousTask) {
        setUndoAction(
          createUpdateUndo(previousTask, updated, "タスクを元に戻す"),
        );
      }
      setTasks((previous) =>
        previous.map((task) => (task.id === updated.id ? updated : task)),
      );
    },
    onSettled: () => {
      invalidateTasksWhenSettled();
    },
  });

  const createMutation = useMutation({
    mutationKey: taskMutationKey,
    mutationFn: ({ title, date }: { title: string; date: string }) =>
      createTask(title, date),
    onMutate: async ({ title, date }) => {
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
      setOperationError(null);
      setUndoAction({
        message: "追加を取り消す",
        run: async () => {
          const currentBeforeUndo =
            queryClient
              .getQueryData<Task[]>(queryKeys.tasks)
              ?.find((item) => item.id === task.id) ?? task;
          setTasks((previous) =>
            previous.filter((item) => item.id !== task.id),
          );
          try {
            await deleteTask(task.id);
            setOperationError(null);
            void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
          } catch {
            replaceTask(currentBeforeUndo);
            showUndoError();
            void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
            throw new Error("Failed to undo task creation");
          }
        },
      });
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
      invalidateTasksWhenSettled();
    },
  });

  const deleteMutation = useMutation({
    mutationKey: taskMutationKey,
    mutationFn: deleteTask,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks });
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks) ?? [];
      setTasks((current) => current.filter((task) => task.id !== id));
      return { previous };
    },
    onError: (_error, variables, context) => {
      if (context) {
        restoreTaskFromSnapshot(context.previous, variables);
      } else {
        showOperationError();
      }
    },
    onSuccess: (_deleted, id, context) => {
      setOperationError(null);
      const previousTask = context?.previous.find((task) => task.id === id);
      if (previousTask) {
        setUndoAction({
          message: "削除を取り消す",
          run: async () => {
            const currentBeforeUndo =
              queryClient.getQueryData<Task[]>(queryKeys.tasks) ?? [];
            replaceTask(previousTask);
            try {
              const restored = await updateTask(previousTask.id, {
                title: previousTask.title,
                date: previousTask.date,
                doneAt: previousTask.doneAt,
                deletedAt: null,
              });
              replaceTask(restored);
              setOperationError(null);
              void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
            } catch {
              queryClient.setQueryData<Task[]>(
                queryKeys.tasks,
                currentBeforeUndo,
              );
              showUndoError();
              void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
              throw new Error("Failed to undo task deletion");
            }
          },
        });
      }
    },
    onSettled: () => {
      invalidateTasksWhenSettled();
    },
  });

  const add = (date: string, text: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return;
    setUndoAction(null);
    createMutation.mutate({ title: clean, date });
  };

  const toggle = (id: number) => {
    if (isOptimisticTaskId(id)) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const doneAt = task.doneAt ? null : new Date().toISOString();
    setUndoAction(null);
    updateMutation.mutate({
      id,
      updates: { doneAt },
      optimistic: (current) => ({ ...current, doneAt }),
    });
  };

  const remove = (id: number) => {
    if (isOptimisticTaskId(id)) return;
    setUndoAction(null);
    deleteMutation.mutate(id);
  };

  const edit = (id: number, text: string) => {
    if (isOptimisticTaskId(id)) return;
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) {
      remove(id);
      return;
    }
    const task = tasks.find((t) => t.id === id);
    if (!task || task.title === clean) return;
    setUndoAction(null);
    updateMutation.mutate({
      id,
      updates: { title: clean },
      optimistic: (current) => ({ ...current, title: clean }),
    });
  };

  const moveTo = (id: number, date: string) => {
    if (isOptimisticTaskId(id)) return;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.date === date) return;
    setUndoAction(null);
    updateMutation.mutate({
      id,
      updates: { date },
      optimistic: (current) => ({ ...current, date }),
    });
  };

  const undo = async () => {
    const action = undoAction;
    if (!action || undoing) return;
    setUndoing(true);
    setUndoAction(null);
    try {
      await action.run();
    } catch {
      // The action already restored visible state and surfaced an error.
    } finally {
      setUndoing(false);
    }
  };

  return {
    tasks,
    loading: query.isLoading,
    error: query.error ? String(query.error) : null,
    operationError,
    undoState: undoAction
      ? { message: undoAction.message, undoing }
      : { message: null, undoing },
    add,
    toggle,
    remove,
    edit,
    moveTo,
    undo,
  };
}
