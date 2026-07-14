import { useState } from "react";
import { format } from "date-fns";
import {
  useDisconnectGoogleCalendar,
  useGoogleCalendarList,
  useGoogleCalendarStatus,
  useSyncGoogleCalendarNow,
  useUpdateGoogleCalendarSettings,
} from "@/hooks/useGoogleCalendar";

export default function GoogleCalendarPanel() {
  const [open, setOpen] = useState(false);
  const { data: status, isLoading } = useGoogleCalendarStatus();
  const connected = !!status?.connected;

  const { data: calendars } = useGoogleCalendarList(open && connected);
  const updateSettings = useUpdateGoogleCalendarSettings();
  const syncNow = useSyncGoogleCalendarNow();
  const disconnect = useDisconnectGoogleCalendar();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
          connected
            ? "border-forest-100 text-forest-600 hover:bg-forest-50"
            : "border-forest-100 text-forest-400 hover:bg-forest-50"
        }`}
      >
        {isLoading
          ? "Google Calendar"
          : connected
            ? "Google Calendar ✓"
            : "Connect Google Calendar"}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-forest-100 bg-cream-50 p-4 shadow-soft">
          {!status?.connected ? (
            <div className="space-y-2">
              <p className="text-sm text-forest-500">
                Two-way sync: appointments you add here go to Google, and
                events you add in Google show up here.
              </p>
              <a
                href="/api/integrations/google-calendar/connect"
                className="block w-full rounded-lg bg-forest-600 px-3 py-2 text-center text-sm text-cream-50 shadow-soft hover:bg-forest-700 transition-colors"
              >
                Connect Google Calendar
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-forest-600">
                {status.enabled ? "Syncing" : "Sync paused"} &middot;{" "}
                {status.lastSyncedAt
                  ? `last synced ${format(new Date(status.lastSyncedAt), "h:mma")}`
                  : "not synced yet"}
              </div>

              {calendars && calendars.length > 0 && (
                <div>
                  <label className="block text-xs text-forest-400 mb-1">
                    Calendar
                  </label>
                  <select
                    value={status.googleCalendarId}
                    onChange={(e) =>
                      updateSettings.mutate({ googleCalendarId: e.target.value })
                    }
                    className="w-full rounded-lg border border-forest-100 px-2 py-1.5 bg-white/80 text-sm text-forest-700"
                  >
                    {calendars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.summary}
                        {c.primary ? " (primary)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-forest-500">
                <input
                  type="checkbox"
                  checked={status.enabled}
                  onChange={(e) =>
                    updateSettings.mutate({ enabled: e.target.checked })
                  }
                  className="accent-forest-600"
                />
                Sync enabled
              </label>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => syncNow.mutate()}
                  disabled={syncNow.isPending}
                  className="text-sm text-forest-500 hover:text-forest-700"
                >
                  {syncNow.isPending ? "Syncing…" : "Sync now"}
                </button>
                <button
                  onClick={() => disconnect.mutate()}
                  className="text-sm text-walnut-500 hover:text-walnut-700"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
