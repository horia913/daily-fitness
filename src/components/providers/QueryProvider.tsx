"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // revisiting a screen within 30s serves cache, no refetch
            gcTime: 5 * 60_000, // keep unused cache 5 min
            refetchOnWindowFocus: false, // PWA: don't refetch every time the app regains focus
            refetchOnReconnect: true, // do refetch when the network comes back
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
