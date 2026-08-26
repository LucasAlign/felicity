import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Project, InsertProject } from "@shared/schema";

const KEY = ["/api/projects"];

export function useProjects() {
  return useQuery<Project[]>({ queryKey: KEY });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertProject) =>
      apiRequest("POST", "/api/projects", data).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertProject> }) =>
      apiRequest("PATCH", `/api/projects/${id}`, data).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
