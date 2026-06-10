import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  type WeeklyCycle,
  fetchWeeklyCycle,
  fetchWeeklyCycles,
  upsertWeeklyCycle,
} from "../api/weeklyCycles";
import { queryKeys } from "../query";

export function useWeeklyCycles() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.weeklyCycles,
    queryFn: fetchWeeklyCycles,
  });

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.weeklyCycles });
  }, [queryClient]);

  return {
    cycles: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? String(query.error) : null,
    reload,
  };
}

export function useWeeklyCycle(week: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.weeklyCycle(week),
    queryFn: () => fetchWeeklyCycle(week),
  });

  const saveMutation = useMutation({
    mutationFn: (content: { goalContent: string; reviewContent: string }) =>
      upsertWeeklyCycle(week, content),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.weeklyCycle(week), updated);
      queryClient.setQueryData<WeeklyCycle[]>(
        queryKeys.weeklyCycles,
        (previous = []) => {
          const withoutCurrent = previous.filter(
            (cycle) => cycle.week !== updated.week,
          );
          return [updated, ...withoutCurrent].sort((a, b) =>
            b.week.localeCompare(a.week),
          );
        },
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.weeklyCycle(week),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.weeklyCycles });
    },
  });

  const save = useCallback(
    async (content: { goalContent: string; reviewContent: string }) => {
      try {
        return await saveMutation.mutateAsync(content);
      } catch {
        return null;
      }
    },
    [saveMutation],
  );

  return {
    cycle: query.data ?? null,
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
