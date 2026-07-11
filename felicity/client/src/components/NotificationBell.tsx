import { useState } from "react";
import { format } from "date-fns";
import {
  useDismissNotification,
  useDueNotifications,
} from "@/hooks/useNotifications";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useDueNotifications();
  const dismiss = useDismissNotification();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative text-forest-400 hover:text-forest-600 text-lg"
        aria-label="Notifications"
      >
        🔔
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full bg-walnut-500 text-cream-50 text-[10px] leading-4 text-center">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-cream-50 border border-forest-100 shadow-soft z-50 p-3">
            <h4 className="text-sm text-forest-600 px-2 mb-2">
              Notifications
            </h4>
            {notifications.length === 0 ? (
              <p className="text-sm text-forest-400 px-2 py-3">
                You're all caught up.
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-start justify-between gap-2 rounded-lg bg-white/70 border border-forest-100 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm text-forest-700">
                        {n.message}
                      </div>
                      <div className="text-xs text-forest-300">
                        {format(new Date(n.remindAt), "MMM d, h:mma")}
                      </div>
                    </div>
                    <button
                      onClick={() => dismiss.mutate(n.id)}
                      className="text-forest-300 hover:text-forest-600 text-sm shrink-0"
                      aria-label="Dismiss"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
