import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { WisdomEntry, InsertWisdomEntry } from "@shared/schema";

const KEY = ["/api/wisdom"];

export function useWisdomEntries() {
  return useQuery<WisdomEntry[]>({ queryKey: KEY });
}

export function useCreateWisdomEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertWisdomEntry) =>
      apiRequest("POST", "/api/wisdom", data).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteWisdomEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/wisdom/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
