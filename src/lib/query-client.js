import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 30_000, // 30s default — reduce unnecessary API calls
      gcTime: 5 * 60_000, // 5min cache retention
    },
    mutations: {
      retry: 0,
    },
  },
});