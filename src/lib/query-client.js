import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      // Aggressive caching: data stays fresh for 2min, kept in memory for 10min
      staleTime: 2 * 60_000,
      gcTime: 10 * 60_000,
      // Do NOT refetch on mount if data is still fresh
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
});