import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Lists shown less than 30 seconds ago appear without a request. Older
      // ones appear at once from memory and refresh in the background.
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      // A 4xx will fail the same way again, so only retry server or network errors.
      retry: (failures, error) => {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        return failures < 1 && !(status && status >= 400 && status < 500);
      },
    },
  },
});

export const listKeys = {
  invoices: ["invoices"] as const,
  purchases: ["purchases"] as const,
  customers: ["customers"] as const,
  items: ["items"] as const,
  batches: ["batches"] as const,
  hsn: ["hsn"] as const,
  taxSlabs: ["taxSlabs"] as const,
};

// A sale, purchase, return or cancellation changes stock, so every list that
// shows stock must load again.
export function refreshStockLists() {
  for (const key of [
    listKeys.invoices,
    listKeys.purchases,
    listKeys.items,
    listKeys.batches,
  ]) {
    void queryClient.invalidateQueries({ queryKey: key });
  }
}
