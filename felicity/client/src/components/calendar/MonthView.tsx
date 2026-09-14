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
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Plus, StickyNote, Sun } from "lucide-react";
import type { Appointment, Task } from "@shared/schema";
import { useCategories } from "@/hooks/useCategories";
import { colorForCategory } from "@/lib/categories";
import { TASK_DRAG_MIME } from "@/lib/tasks";
import CategoryChip from "./CategoryChip";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthView({
  currentDate,
  appointments,
  tasks = [],
  onSelectDay,
  onAssignTask,
  onSelectAppointment,
  onSelectTask,
}: {
  currentDate: Date;
  appointments: Appointment[];
  // Tasks with a due date render as chips on their day, distinct from
  // appointments, so a dropped/scheduled task is visible on the grid (#20).
  tasks?: Task[];
  onSelectDay: (day: Date) => void;
  // Called when an unassigned task is dropped onto a day (#4).
  onAssignTask?: (taskId: number, day: Date) => void;
  onSelectAppointment?: (appointment: Appointment) => void;
  onSelectTask?: (task: Task) => void;
}) {
  const { data: categories = [] } = useCategories();
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(currentDate);
  useEffect(() => setSelectedDay(currentDate), [currentDate]);
  const gridStart = startOfWeek(startOfMonth(currentDate));
  const gridEnd = endOfWeek(endOfMonth(currentDate));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const selectedAppointments = appointments
    .filter((item) => isSameDay(new Date(item.startTime), selectedDay))
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  const selectedTasks = tasks
    .filter(
      (item) =>
        !item.completed &&
        item.dueDate &&
        isSameDay(new Date(item.dueDate), selectedDay),
    )
    .sort(
      (a, b) =>
        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
    );

  return (
    <div className="rounded-2xl bg-white/70 border border-forest-100 shadow-soft overflow-hidden">
      <div className="sm:hidden">
        <div className="grid grid-cols-7 border-b border-forest-100 px-2 pt-2">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-forest-300">
              {label.slice(0, 1)}
            </div>
          ))}
          {days.map((day) => {
            const count =
              appointments.filter((item) => isSameDay(new Date(item.startTime), day)).length +
              tasks.filter(
                (item) =>
                  !item.completed &&
                  item.dueDate &&
                  isSameDay(new Date(item.dueDate), day),
              ).length;
            const selected = isSameDay(day, selectedDay);
            return (
              <button
                key={`mobile-${day.toISOString()}`}
                type="button"
                onClick={() => setSelectedDay(day)}
                className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg"
                aria-pressed={selected}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                  selected
                    ? "bg-forest-600 text-cream-50"
                    : isToday(day)
                      ? "ring-1 ring-forest-500 text-forest-700"
                      : isSameMonth(day, currentDate)
                        ? "text-forest-600"
                        : "text-forest-300"
                }`}>
                  {format(day, "d")}
                </span>
                <span className={`h-1 w-1 rounded-full ${count ? "bg-walnut-500" : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
        <div className="p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-forest-700">{format(selectedDay, "EEEE, MMMM d")}</h3>
            <button type="button" onClick={() => onSelectDay(selectedDay)} className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-walnut-500 px-3 text-sm text-cream-50">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {selectedAppointments.length === 0 && selectedTasks.length === 0 ? (
            <p className="py-3 text-sm text-forest-300">Nothing scheduled.</p>
          ) : (
            <div className="space-y-2">
              {selectedAppointments.map((item) => (
                <button key={item.id} type="button" onClick={() => onSelectAppointment?.(item)} className="flex min-h-14 w-full items-start gap-3 rounded-xl border border-forest-100 bg-white/80 p-3 text-left">
                  <span className="w-16 shrink-0 text-xs font-medium text-forest-500">{item.allDay ? "All day" : format(new Date(item.startTime), "h:mm a")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-medium text-forest-700">{item.title}{item.description && <StickyNote className="h-4 w-4 shrink-0 text-haze-500" />}</span>
                    {item.description && <span className="mt-1 line-clamp-2 block text-xs text-forest-400">{item.description}</span>}
                    <span className="mt-2 block"><CategoryChip categoryId={item.categoryId} categories={categories} /></span>
                  </span>
                </button>
              ))}
              {selectedTasks.map((item) => (
                <button key={`task-${item.id}`} type="button" onClick={() => onSelectTask?.(item)} className="flex min-h-14 w-full items-start gap-3 rounded-xl border border-dashed border-forest-200 bg-white/70 p-3 text-left">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-forest-400" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-medium text-forest-700">{item.title}{item.description && <StickyNote className="h-4 w-4 shrink-0 text-haze-500" />}</span>
                    {item.description && <span className="mt-1 line-clamp-2 block text-xs text-forest-400">{item.description}</span>}
                    <span className="mt-2 block"><CategoryChip categoryId={item.categoryId} categories={categories} /></span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden sm:block">
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
          const dayAppointments = appointments
            .filter((a) => isSameDay(new Date(a.startTime), day))
            .sort((a, b) => {
              if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
              return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            });
          const dayTasks = tasks
            .filter(
              (t) =>
                !t.completed &&
                t.dueDate &&
                isSameDay(new Date(t.dueDate), day),
            )
            .sort(
              (a, b) =>
                new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
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
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectAppointment?.(a);
                    }}
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
                    {a.description && <StickyNote className="h-3 w-3 shrink-0 text-haze-500" aria-label="Has notes" />}
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-forest-300">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
                {dayTasks.slice(0, 2).map((t) => (
                  <div
                    key={`task-${t.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTask?.(t);
                    }}
                    className="flex items-center gap-1 rounded border border-dashed border-forest-200 bg-white/60 px-1.5 py-0.5 text-xs text-forest-600 hover:bg-white"
                    title={`Task: ${t.title}`}
                  >
                    <CheckCircle2
                      className="h-3 w-3 shrink-0 text-forest-400"
                      aria-hidden="true"
                    />
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: colorForCategory(t.categoryId, categories),
                      }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <div className="text-xs text-forest-300">
                    +{dayTasks.length - 2} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
