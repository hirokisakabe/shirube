import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

export const queryKeys = {
  tasks: ["tasks"] as const,
  weeklyCycles: ["weekly-cycles"] as const,
  weeklyCycle: (week: string) => ["weekly-cycle", week] as const,
};

export function createWebQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function AppQueryProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
