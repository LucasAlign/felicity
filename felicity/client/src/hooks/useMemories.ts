import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Memory, InsertMemory } from "@shared/schema";

const KEY = ["/api/memories"];

export function useMemories() {
  return useQuery<Memory[]>({ queryKey: KEY });
}

export function useScanMemories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/memories/scan").then(
        (r) => r.json() as Promise<Memory[]>,
      ),
    onSuccess: (data) => queryClient.setQueryData(KEY, data),
  });
}

export function useUpdateMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertMemory> }) =>
      apiRequest("PATCH", `/api/memories/${id}`, data).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRespondToMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      response,
    }: {
      id: number;
      response: "yes" | "no" | "dont_ask_again";
    }) =>
      apiRequest("PATCH", `/api/memories/${id}/respond`, { response }).then(
        (r) => r.json(),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/memories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
