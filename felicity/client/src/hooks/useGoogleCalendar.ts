import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { KEY as APPOINTMENTS_KEY } from "./useAppointments";

const STATUS_KEY = ["/api/integrations/google-calendar/status"];
const CALENDARS_KEY = ["/api/integrations/google-calendar/calendars"];

export type GoogleCalendarStatus =
  | { connected: false }
  | {
      connected: true;
      enabled: boolean;
      googleCalendarId: string;
      lastSyncedAt: string | null;
    };

export function useGoogleCalendarStatus() {
  return useQuery<GoogleCalendarStatus>({ queryKey: STATUS_KEY });
}

export function useGoogleCalendarList(enabled: boolean) {
  return useQuery<Array<{ id: string; summary: string; primary?: boolean }>>({
    queryKey: CALENDARS_KEY,
    enabled,
  });
}

export function useUpdateGoogleCalendarSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { enabled?: boolean; googleCalendarId?: string }) =>
      apiRequest(
        "PATCH",
        "/api/integrations/google-calendar/settings",
        data,
      ).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
  });
}

export function useSyncGoogleCalendarNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/integrations/google-calendar/sync").then((r) =>
        r.json(),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_KEY });
    },
  });
}

export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest("DELETE", "/api/integrations/google-calendar"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
  });
}
