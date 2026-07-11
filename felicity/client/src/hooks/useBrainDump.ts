import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type {
  Appointment,
  BrainDump,
  Idea,
  Note,
  PrayerRequest,
  ShoppingItem,
  Task,
} from "@shared/schema";

export interface BrainDumpResult {
  brainDump: BrainDump;
  appointments: Appointment[];
  tasks: Task[];
  notes: Note[];
  ideas: Idea[];
  shoppingItems: ShoppingItem[];
  prayerRequests: PrayerRequest[];
}

const INVALIDATE_KEYS = [
  ["/api/appointments"],
  ["/api/tasks"],
  ["/api/notes"],
  ["/api/ideas"],
  ["/api/shopping-items"],
  ["/api/prayer-requests"],
];

export function useSubmitBrainDump() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      transcript: string;
      inputMethod: "voice" | "manual" | "ocr_upload";
    }) =>
      apiRequest("POST", "/api/brain-dump", data).then(
        (r) => r.json() as Promise<BrainDumpResult>,
      ),
    onSuccess: () => {
      for (const key of INVALIDATE_KEYS) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
