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
import { useState } from "react";
import { Clock, Sun } from "lucide-react";
import type { Appointment } from "@shared/schema";
import { useCategories } from "@/hooks/useCategories";
import { colorForCategory } from "@/lib/categories";
import { TASK_DRAG_MIME } from "@/lib/tasks";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthView({
  currentDate,
  appointments,
  onSelectDay,
  onAssignTask,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onSelectDay: (day: Date) => void;
  // Called when an unassigned task is dropped onto a day (#4).
  onAssignTask?: (taskId: number, day: Date) => void;
}) {
  const { data: categories = [] } = useCategories();
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
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
          const dayKey = day.toISOString();
          const isDropTarget = dragOverKey === dayKey;

          return (
            <button
              key={dayKey}
              onClick={() => onSelectDay(day)}
              onDragOver={
                onAssignTask
                  ? (e) => {
                      // Only accept a task drag; allow the drop.
                      if (e.dataTransfer.types.includes(TASK_DRAG_MIME)) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverKey !== dayKey) setDragOverKey(dayKey);
                      }
                    }
                  : undefined
              }
              onDragLeave={
                onAssignTask
                  ? () => setDragOverKey((k) => (k === dayKey ? null : k))
                  : undefined
              }
              onDrop={
                onAssignTask
                  ? (e) => {
                      const raw = e.dataTransfer.getData(TASK_DRAG_MIME);
                      setDragOverKey(null);
                      if (!raw) return;
                      e.preventDefault();
                      const id = Number(raw);
                      if (Number.isInteger(id)) onAssignTask(id, day);
                    }
                  : undefined
              }
              className={`min-h-24 border-b border-r border-forest-50 p-2 text-left align-top transition-colors ${
                isDropTarget
                  ? "bg-forest-100 ring-2 ring-inset ring-forest-400"
                  : inMonth
                    ? "hover:bg-forest-50/60"
                    : "bg-forest-50/30 hover:bg-forest-50/60"
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
                    className="flex items-center gap-1 rounded bg-forest-100 px-1.5 py-0.5 text-xs text-forest-700"
                    title={
                      a.syncStatus === "conflict"
                        ? "Synced with Google Calendar — a conflicting edit was auto-resolved"
                        : a.source === "google_calendar"
                          ? "Synced with Google Calendar"
                          : undefined
                    }
                  >
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: colorForCategory(a.categoryId, categories),
                      }}
                      aria-hidden="true"
                    />
                    {a.source === "google_calendar" && (
                      <span className="shrink-0 text-forest-400">●</span>
                    )}
                    {a.syncStatus === "conflict" && (
                      <span className="shrink-0 text-walnut-500">⚠</span>
                    )}
                    {a.allDay ? (
                      <Sun className="h-3 w-3 shrink-0 text-forest-400" aria-hidden="true" />
                    ) : (
                      <Clock className="h-3 w-3 shrink-0 text-forest-400" aria-hidden="true" />
                    )}
                    {!a.allDay && (
                      <span className="shrink-0 tabular-nums">
                        {format(new Date(a.startTime), "h:mma")}
                      </span>
                    )}
                    <span className="truncate">{a.title}</span>
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
