import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { PrayerRequest, InsertPrayerRequest } from "@shared/schema";

const KEY = ["/api/prayer-requests"];

export function usePrayerRequests() {
  return useQuery<PrayerRequest[]>({ queryKey: KEY });
}

export function useCreatePrayerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertPrayerRequest) =>
      apiRequest("POST", "/api/prayer-requests", data).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePrayerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/prayer-requests/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
