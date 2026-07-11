import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Appointment, InsertAppointment } from "@shared/schema";

const KEY = ["/api/appointments"];

export function useAppointments() {
  return useQuery<Appointment[]>({ queryKey: KEY });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertAppointment) =>
      apiRequest("POST", "/api/appointments", data).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<InsertAppointment>;
    }) =>
      apiRequest("PATCH", `/api/appointments/${id}`, data).then((r) =>
        r.json(),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/appointments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
