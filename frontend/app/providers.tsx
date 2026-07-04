"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { connectWs } from "@/lib/ws";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            // Poll every 30 seconds as a fallback if WebSocket misses an event
            refetchInterval: 30_000,
            refetchIntervalInBackground: false,
          },
        },
      })
  );

  useEffect(() => {
    // Initialize WebSocket connection globally
    connectWs();
    // Keep connection alive for the app lifetime
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
