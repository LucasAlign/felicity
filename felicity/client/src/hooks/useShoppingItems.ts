import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ShoppingItem, InsertShoppingItem } from "@shared/schema";

const KEY = ["/api/shopping-items"];

export function useShoppingItems() {
  return useQuery<ShoppingItem[]>({ queryKey: KEY });
}

export function useCreateShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertShoppingItem) =>
      apiRequest("POST", "/api/shopping-items", data).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<InsertShoppingItem>;
    }) =>
      apiRequest("PATCH", `/api/shopping-items/${id}`, data).then((r) =>
        r.json(),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/shopping-items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
