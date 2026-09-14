import { useMemo } from "react";
import { addDays, format, isBefore, isSameDay, startOfDay } from "date-fns";
import { CalendarClock, CheckCircle2, MapPin, StickyNote } from "lucide-react";
import type { Appointment, Category, Task } from "@shared/schema";
import { useCategories } from "@/hooks/useCategories";
import CategoryChip from "./CategoryChip";

type AgendaItem =
  | { kind: "appointment"; value: Appointment; time: number }
  | { kind: "task"; value: Task; time: number };

export default function AgendaView({
  currentDate,
  appointments,
  tasks,
  onSelectAppointment,
  onSelectTask,
}: {
  currentDate: Date;
  appointments: Appointment[];
  tasks: Task[];
  onSelectAppointment: (appointment: Appointment) => void;
  onSelectTask: (task: Task) => void;
}) {
  const { data: categories = [] } = useCategories();
  const start = startOfDay(currentDate);
  const days = useMemo(
    () => Array.from({ length: 14 }, (_, index) => addDays(start, index)),
    [start.getTime()],
  );

  const itemsByDay = useMemo(() => {
    return days.map((day) => {
      const items: AgendaItem[] = [
        ...appointments
          .filter((item) => isSameDay(new Date(item.startTime), day))
          .map((value) => ({
            kind: "appointment" as const,
            value,
            time: value.allDay ? 0 : new Date(value.startTime).getTime(),
          })),
        ...tasks
          .filter(
            (item) =>
              !item.completed &&
              item.dueDate &&
              isSameDay(new Date(item.dueDate), day),
          )
          .map((value) => ({
            kind: "task" as const,
            value,
            time: new Date(value.dueDate!).getTime(),
          })),
      ].sort((a, b) => {
        if (a.kind === "appointment" && a.value.allDay) return -1;
        if (b.kind === "appointment" && b.value.allDay) return 1;
        return a.time - b.time;
      });
      return { day, items };
    });
  }, [appointments, tasks, days]);

  const overdue = tasks
    .filter(
      (task) =>
        !task.completed && task.dueDate && isBefore(new Date(task.dueDate), start),
    )
    .sort(
      (a, b) =>
        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
    );

  return (
    <div className="rounded-2xl border border-forest-100 bg-white/70 shadow-soft overflow-hidden">
      {overdue.length > 0 && (
        <section className="border-b border-walnut-100 bg-walnut-50/50 p-3 sm:p-4">
          <h3 className="mb-2 text-sm font-semibold text-walnut-700">
            Overdue · {overdue.length}
          </h3>
          <div className="space-y-2">
            {overdue.map((task) => (
              <AgendaRow
                key={`overdue-${task.id}`}
                item={{ kind: "task", value: task, time: 0 }}
                categories={categories}
                onSelectAppointment={onSelectAppointment}
                onSelectTask={onSelectTask}
              />
            ))}
          </div>
        </section>
      )}

      {itemsByDay.filter(({ items }, index) => index < 2 || items.length > 0).map(({ day, items }) => (
        <section key={day.toISOString()} className="border-b border-forest-50 last:border-0">
          <div className="sticky top-[73px] z-10 flex items-baseline gap-2 bg-cream-50/95 px-3 py-2 backdrop-blur sm:px-4">
            <h3 className="font-semibold text-forest-700">
              {isSameDay(day, start)
                ? "Today"
                : isSameDay(day, addDays(start, 1))
                  ? "Tomorrow"
                  : format(day, "EEEE")}
            </h3>
            <span className="text-xs text-forest-400">{format(day, "MMM d")}</span>
          </div>
          <div className="space-y-2 p-3 sm:p-4">
            {items.length === 0 ? (
              <p className="py-1 text-sm text-forest-300">Nothing scheduled.</p>
            ) : (
              items.map((item) => (
                <AgendaRow
                  key={`${item.kind}-${item.value.id}`}
                  item={item}
                  categories={categories}
                  onSelectAppointment={onSelectAppointment}
                  onSelectTask={onSelectTask}
                />
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function AgendaRow({
  item,
  categories,
  onSelectAppointment,
  onSelectTask,
}: {
  item: AgendaItem;
  categories: Category[];
  onSelectAppointment: (appointment: Appointment) => void;
  onSelectTask: (task: Task) => void;
}) {
  const value = item.value;
  const isAppointment = item.kind === "appointment";
  const description = value.description?.trim();

  return (
    <button
      type="button"
      onClick={() =>
        isAppointment
          ? onSelectAppointment(value as Appointment)
          : onSelectTask(value as Task)
      }
      className="flex min-h-14 w-full gap-3 rounded-xl border border-forest-100 bg-white/80 p-3 text-left transition-colors hover:border-forest-200 hover:bg-white"
    >
      <div className="w-16 shrink-0 pt-0.5 text-xs font-medium tabular-nums text-forest-500">
        {isAppointment
          ? (value as Appointment).allDay
            ? "All day"
            : format(new Date((value as Appointment).startTime), "h:mm a")
          : "Task"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {isAppointment ? (
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-forest-400" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest-400" />
          )}
          <span className="min-w-0 flex-1 font-medium text-forest-700">
            {value.title}
          </span>
          {description && <StickyNote className="h-4 w-4 shrink-0 text-haze-500" aria-label="Has notes" />}
        </div>
        {description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-forest-400">
            {description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <CategoryChip categoryId={value.categoryId} categories={categories} />
          {isAppointment && (value as Appointment).location && (
            <span className="inline-flex items-center gap-1 text-xs text-forest-400">
              <MapPin className="h-3 w-3" />
              {(value as Appointment).location}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
