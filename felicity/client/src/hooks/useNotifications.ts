import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

const KEY = ["/api/notifications/due"];

export function useDueNotifications() {
  return useQuery<Notification[]>({
    queryKey: KEY,
    refetchInterval: 30_000,
  });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest("PATCH", `/api/notifications/${id}/dismiss`).then((r) =>
        r.json(),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
