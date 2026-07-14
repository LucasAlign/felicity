import { storage } from "./storage";
import { sendPush } from "./push";
import { syncAllConnections } from "./googleCalendarSync";

const TICK_INTERVAL_MS = 60_000;
// Google Calendar sync doesn't need minute-level polling (real edits push
// immediately from the appointment routes) — this tick is just the safety
// net that catches changes made directly in Google and retries anything
// that failed to push earlier.
const CALENDAR_SYNC_INTERVAL_MS = 5 * 60_000;

// Hands any notification whose remindAt has arrived off to the push
// channel (currently a no-op stub) and marks it fired so it isn't handed
// off again. In-app visibility doesn't depend on this — the frontend polls
// GET /api/notifications/due independently, gated on remindAt + dismissed.
async function tick(): Promise<void> {
  const due = await storage.listUnfiredDueNotifications(new Date());
  for (const notification of due) {
    await sendPush(notification.userId, notification);
    await storage.markNotificationFired(notification.id);
  }
}

export function startNotificationScheduler(): void {
  setInterval(() => {
    tick().catch((err) => console.error("Notification scheduler tick failed:", err));
  }, TICK_INTERVAL_MS);
}

export function startGoogleCalendarSyncScheduler(): void {
  setInterval(() => {
    syncAllConnections().catch((err) =>
      console.error("Google Calendar sync tick failed:", err),
    );
  }, CALENDAR_SYNC_INTERVAL_MS);
}
