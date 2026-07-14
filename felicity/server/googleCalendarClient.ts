import type { Appointment, InsertAppointment } from "@shared/schema";

const API_BASE = "https://www.googleapis.com/calendar/v3";

export class GoogleCalendarGoneError extends Error {
  constructor() {
    super("Google sync token expired (410) — a full resync is required");
  }
}

export type GoogleEvent = {
  id: string;
  status?: string; // "confirmed" | "cancelled" | ...
  updated?: string; // RFC3339 — Google's last-modified stamp for this event
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

async function googleFetch(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  return res;
}

export async function listCalendars(
  accessToken: string,
): Promise<Array<{ id: string; summary: string; primary?: boolean }>> {
  const res = await googleFetch(accessToken, "/users/me/calendarList");
  if (!res.ok) {
    throw new Error(`Failed to list Google calendars: ${res.status}`);
  }
  const body = await res.json();
  return body.items ?? [];
}

// Incremental sync: pass the stored syncToken to get only what changed since
// last time. Pass none for a full sync (first connect, or after a 410).
// Google paginates with pageToken; the final page carries nextSyncToken
// instead, which is what gets stored for the next call.
export async function listEvents(
  accessToken: string,
  calendarId: string,
  syncToken?: string | null,
): Promise<{ events: GoogleEvent[]; nextSyncToken: string }> {
  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  do {
    const params = new URLSearchParams({ maxResults: "250" });
    if (syncToken) {
      // Incremental sync needs to see deletions too, so cancelled events can
      // propagate to a local delete.
      params.set("syncToken", syncToken);
      params.set("showDeleted", "true");
    } else {
      // Full syncs don't take a time bound in this design — everything the
      // user can see gets mirrored — but skip ancient history so a first
      // connect doesn't import a decade of past events.
      params.set(
        "timeMin",
        new Date(Date.now() - 90 * 86400 * 1000).toISOString(),
      );
      params.set("showDeleted", "false");
    }
    if (pageToken) params.set("pageToken", pageToken);

    const res = await googleFetch(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    );

    if (res.status === 410) {
      throw new GoogleCalendarGoneError();
    }
    if (!res.ok) {
      throw new Error(`Failed to list Google Calendar events: ${res.status}`);
    }

    const body = await res.json();
    events.push(...(body.items ?? []));
    pageToken = body.nextPageToken;
    nextSyncToken = body.nextSyncToken;
  } while (pageToken);

  if (!nextSyncToken) {
    throw new Error("Google Calendar events.list didn't return a syncToken");
  }

  return { events, nextSyncToken };
}

export async function insertEvent(
  accessToken: string,
  calendarId: string,
  appointment: Pick<
    Appointment | InsertAppointment,
    "title" | "description" | "location" | "startTime" | "endTime" | "allDay"
  >,
): Promise<GoogleEvent> {
  const res = await googleFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", body: JSON.stringify(appointmentToGoogleEvent(appointment)) },
  );
  if (!res.ok) {
    throw new Error(`Failed to create Google Calendar event: ${res.status}`);
  }
  return res.json();
}

export async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  appointment: Pick<
    Appointment | InsertAppointment,
    "title" | "description" | "location" | "startTime" | "endTime" | "allDay"
  >,
): Promise<GoogleEvent> {
  const res = await googleFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PATCH", body: JSON.stringify(appointmentToGoogleEvent(appointment)) },
  );
  if (!res.ok) {
    throw new Error(`Failed to update Google Calendar event: ${res.status}`);
  }
  return res.json();
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const res = await googleFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
  // 410/404 mean it's already gone on Google's side — fine, that's the
  // outcome we wanted anyway.
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new Error(`Failed to delete Google Calendar event: ${res.status}`);
  }
}

function appointmentToGoogleEvent(
  appointment: Pick<
    Appointment | InsertAppointment,
    "title" | "description" | "location" | "startTime" | "endTime" | "allDay"
  >,
) {
  const start = new Date(appointment.startTime);
  const end = appointment.endTime
    ? new Date(appointment.endTime)
    : new Date(start.getTime() + 30 * 60 * 1000);

  return {
    summary: appointment.title,
    description: appointment.description ?? undefined,
    location: appointment.location ?? undefined,
    start: appointment.allDay
      ? { date: toDateOnly(start) }
      : { dateTime: start.toISOString() },
    end: appointment.allDay
      ? { date: toDateOnly(addDays(start, 1)) }
      : { dateTime: end.toISOString() },
  };
}

// Maps a Google event back into the fields our appointments table cares
// about. Recurring events arrive pre-expanded into individual instances by
// events.list, so each one maps to a single appointment row — there's no
// RRULE handling here by design (see plan notes on recurring events).
export function googleEventToAppointmentFields(
  event: GoogleEvent,
): Pick<
  InsertAppointment,
  "title" | "description" | "location" | "startTime" | "endTime" | "allDay"
> {
  const allDay = !!event.start?.date;
  const startTime = allDay
    ? new Date(`${event.start!.date}T00:00:00`)
    : new Date(event.start!.dateTime!);
  const endTime = allDay
    ? null
    : event.end?.dateTime
      ? new Date(event.end.dateTime)
      : null;

  return {
    title: event.summary || "(untitled)",
    description: event.description ?? null,
    location: event.location ?? null,
    startTime,
    endTime,
    allDay,
  };
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400 * 1000);
}
