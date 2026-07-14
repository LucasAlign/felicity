import { storage } from "./storage";
import { getValidAccessToken } from "./googleCalendarAuth";
import {
  GoogleCalendarGoneError,
  deleteEvent,
  googleEventToAppointmentFields,
  insertEvent,
  listEvents,
  updateEvent,
  type GoogleEvent,
} from "./googleCalendarClient";
import type { Appointment } from "@shared/schema";

// Pushes one appointment's current local state to Google — insert if it's
// never been linked, update if it has. Never throws: a failed push just
// leaves (or puts) the appointment in "pending_push" so the periodic sync
// tick retries it later, instead of failing whatever local request
// triggered this (a save shouldn't fail because Google is briefly down).
// Returns the syncStatus that was actually persisted, so callers that chain
// more sync-state writes after this know whether it really landed.
export async function pushAppointmentToGoogle(
  userId: string,
  appointment: Appointment,
): Promise<Appointment["syncStatus"]> {
  const connection = await storage.getGoogleCalendarConnection(userId);
  if (!connection || !connection.enabled) return appointment.syncStatus;

  try {
    const accessToken = await getValidAccessToken(userId);
    const event = appointment.externalId
      ? await updateEvent(
          accessToken,
          connection.googleCalendarId,
          appointment.externalId,
          appointment,
        )
      : await insertEvent(accessToken, connection.googleCalendarId, appointment);

    await storage.updateAppointment(
      userId,
      appointment.id,
      {},
      {
        externalId: event.id,
        googleUpdatedAt: event.updated ? new Date(event.updated) : null,
        syncStatus: "synced",
      },
    );
    return "synced";
  } catch (err) {
    console.error(
      `Failed to push appointment ${appointment.id} to Google:`,
      err,
    );
    await storage.updateAppointment(
      userId,
      appointment.id,
      {},
      { syncStatus: "pending_push" },
    );
    return "pending_push";
  }
}

// Best-effort delete of the linked Google event. Called before the local
// row is removed; failures are only logged since there'll be no local
// record left afterward to retry against.
export async function deleteAppointmentFromGoogle(
  userId: string,
  appointment: Appointment,
): Promise<void> {
  if (!appointment.externalId) return;
  const connection = await storage.getGoogleCalendarConnection(userId);
  if (!connection || !connection.enabled) return;

  try {
    const accessToken = await getValidAccessToken(userId);
    await deleteEvent(
      accessToken,
      connection.googleCalendarId,
      appointment.externalId,
    );
  } catch (err) {
    console.error(
      `Failed to delete Google Calendar event for appointment ${appointment.id}:`,
      err,
    );
  }
}

// Pulls everything that changed on Google since the last sync (or
// everything visible, on a first/forced full sync) and reconciles it
// against local appointments. See applyGoogleEvent for the per-event
// create/update/delete/conflict logic.
export async function pullChangesFromGoogle(userId: string): Promise<void> {
  const connection = await storage.getGoogleCalendarConnection(userId);
  if (!connection || !connection.enabled) return;

  const accessToken = await getValidAccessToken(userId);

  let events: GoogleEvent[];
  let nextSyncToken: string;
  try {
    ({ events, nextSyncToken } = await listEvents(
      accessToken,
      connection.googleCalendarId,
      connection.syncToken,
    ));
  } catch (err) {
    if (err instanceof GoogleCalendarGoneError) {
      // Cursor expired on Google's side — drop it so the next tick does a
      // full resync instead of failing forever on a stale token.
      await storage.updateGoogleCalendarConnection(userId, {
        syncToken: null,
      });
      return;
    }
    throw err;
  }

  for (const event of events) {
    await applyGoogleEvent(userId, event);
  }

  await storage.updateGoogleCalendarConnection(userId, {
    syncToken: nextSyncToken,
    lastSyncedAt: new Date(),
  });
}

async function applyGoogleEvent(
  userId: string,
  event: GoogleEvent,
): Promise<void> {
  const existing = await storage.getAppointmentByExternalId(userId, event.id);

  if (event.status === "cancelled") {
    if (!existing) return;
    if (existing.syncStatus === "pending_push") {
      // Google deleted it, but there's a local edit that never reached
      // Google — don't silently destroy the user's pending change.
      await storage.updateAppointment(
        userId,
        existing.id,
        {},
        { syncStatus: "conflict" },
      );
      return;
    }
    await storage.deleteAppointment(userId, existing.id);
    return;
  }

  const googleUpdated = event.updated ? new Date(event.updated) : new Date();
  const fields = googleEventToAppointmentFields(event);

  if (!existing) {
    await storage.createAppointment(
      userId,
      { ...fields, source: "google_calendar" },
      { externalId: event.id, googleUpdatedAt: googleUpdated, syncStatus: "synced" },
    );
    return;
  }

  // Our own write echoing back through the sync loop — Google's `updated`
  // still matches what we stamped after the last push, so nothing actually
  // changed on Google's side since. Skipping this is what prevents an
  // infinite push -> pull -> push loop.
  if (
    existing.googleUpdatedAt &&
    existing.googleUpdatedAt.getTime() === googleUpdated.getTime()
  ) {
    return;
  }

  if (existing.syncStatus === "pending_push") {
    // Both sides changed since the last successful sync. Auto-resolve by
    // recency, but always mark it "conflict" so it stays visible rather
    // than silently overwriting one side's edit.
    const localIsNewer =
      !!existing.updatedAt && existing.updatedAt.getTime() > googleUpdated.getTime();

    if (localIsNewer) {
      const result = await pushAppointmentToGoogle(userId, existing);
      // Only relabel as a (resolved) conflict if the push actually landed —
      // otherwise this needs to stay "pending_push" so it gets retried.
      if (result === "synced") {
        await storage.updateAppointment(
          userId,
          existing.id,
          {},
          { syncStatus: "conflict" },
        );
      }
    } else {
      await storage.updateAppointment(userId, existing.id, fields, {
        googleUpdatedAt: googleUpdated,
        syncStatus: "conflict",
      });
    }
    return;
  }

  await storage.updateAppointment(userId, existing.id, fields, {
    googleUpdatedAt: googleUpdated,
    syncStatus: "synced",
  });
}

// Pull, then retry anything still waiting to reach Google (e.g. a push that
// failed earlier, or an edit made while the connection was disabled).
export async function runFullSync(userId: string): Promise<void> {
  await pullChangesFromGoogle(userId);

  const pending = await storage.listAppointmentsPendingPush(userId);
  for (const appointment of pending) {
    await pushAppointmentToGoogle(userId, appointment);
  }
}

// Driven by the periodic scheduler tick — every connected user, one at a
// time, isolated so one user's failure (revoked token, API hiccup) doesn't
// block anyone else's sync.
export async function syncAllConnections(): Promise<void> {
  const connections = await storage.listEnabledGoogleCalendarConnections();
  for (const connection of connections) {
    try {
      await runFullSync(connection.userId);
    } catch (err) {
      console.error(
        `Google Calendar sync failed for user ${connection.userId}:`,
        err,
      );
    }
  }
}
