import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Appointment } from "@shared/schema";
import { useCategories } from "@/hooks/useCategories";
import { colorForCategory } from "@/lib/categories";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthView({
  currentDate,
  appointments,
  onSelectDay,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onSelectDay: (day: Date) => void;
}) {
  const { data: categories = [] } = useCategories();
  const gridStart = startOfWeek(startOfMonth(currentDate));
  const gridEnd = endOfWeek(endOfMonth(currentDate));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="rounded-2xl bg-white/70 border border-forest-100 shadow-soft overflow-hidden">
      <div className="grid grid-cols-7 border-b border-forest-100">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-3 py-2 text-xs font-medium text-forest-400 text-center"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayAppointments = appointments.filter((a) =>
            isSameDay(new Date(a.startTime), day),
          );
          const inMonth = isSameMonth(day, currentDate);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`min-h-24 border-b border-r border-forest-50 p-2 text-left align-top hover:bg-forest-50/60 transition-colors ${
                inMonth ? "" : "bg-forest-50/30"
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                  isToday(day)
                    ? "bg-forest-600 text-cream-50"
                    : inMonth
                      ? "text-forest-600"
                      : "text-forest-300"
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-1">
                {dayAppointments.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="truncate rounded bg-forest-100 px-1.5 py-0.5 text-xs text-forest-700"
                    title={
                      a.syncStatus === "conflict"
                        ? "Synced with Google Calendar — a conflicting edit was auto-resolved"
                        : a.source === "google_calendar"
                          ? "Synced with Google Calendar"
                          : undefined
                    }
                  >
                    <span
                      className="mr-1 inline-block h-2 w-2 shrink-0 rounded-full align-middle"
                      style={{
                        backgroundColor: colorForCategory(a.categoryId, categories),
                      }}
                      aria-hidden="true"
                    />
                    {a.source === "google_calendar" && (
                      <span className="text-forest-400">●&nbsp;</span>
                    )}
                    {a.syncStatus === "conflict" && (
                      <span className="text-walnut-500">⚠&nbsp;</span>
                    )}
                    {a.allDay ? "" : format(new Date(a.startTime), "h:mma ")}
                    {a.title}
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-forest-300">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
