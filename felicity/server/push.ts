import type { Notification } from "@shared/schema";

// Stub delivery channel. Notifications are generated and surfaced in-app
// today (GET /api/notifications/due). To add real push delivery: register
// a service worker + VAPID keys on the client, store the resulting
// PushSubscription per user, and replace this function's body with a
// `web-push` send using that subscription. The scheduler in
// server/scheduler.ts already calls this at the right time — only the
// delivery mechanism itself is missing.
export async function sendPush(
  userId: string,
  notification: Notification,
): Promise<void> {
  // no-op — see comment above
}
