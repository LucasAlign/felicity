import { format } from "date-fns";
import { CalendarClock, CheckCircle2, MapPin, Pencil, X } from "lucide-react";
import type { Appointment, Category, Task } from "@shared/schema";
import CategoryChip from "./CategoryChip";

export type CalendarSelection =
  | { kind: "appointment"; value: Appointment }
  | { kind: "task"; value: Task };

export default function ItemDetailSheet({
  selection,
  categories,
  onClose,
  onEdit,
}: {
  selection: CalendarSelection | null;
  categories: Category[];
  onClose: () => void;
  onEdit: (selection: CalendarSelection) => void;
}) {
  if (!selection) return null;
  const { value } = selection;
  const appointment: Appointment | null =
    selection.kind === "appointment" ? selection.value : null;
  const task: Task | null = selection.kind === "task" ? selection.value : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-forest-900/30 sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-item-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="max-h-[88dvh] w-full overflow-y-auto rounded-t-2xl bg-cream-50 p-5 shadow-soft-lg sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-forest-200 sm:hidden" />
        <div className="flex items-start gap-3">
          {appointment ? (
            <CalendarClock className="mt-1 h-5 w-5 shrink-0 text-forest-500" />
          ) : (
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-forest-500" />
          )}
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-forest-400">
              {appointment ? "Appointment" : "Task"}
            </p>
            <h3 id="calendar-item-title" className="text-2xl text-forest-700">
              {value.title}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-forest-400 hover:bg-forest-50" aria-label="Close details">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm text-forest-600">
          <div>
            <span className="block text-xs text-forest-400">When</span>
            {appointment
              ? appointment.allDay
                ? `${format(new Date(appointment.startTime), "EEEE, MMMM d")} · All day`
                : `${format(new Date(appointment.startTime), "EEEE, MMMM d · h:mm a")}${
                    appointment.endTime
                      ? `–${format(new Date(appointment.endTime), "h:mm a")}`
                      : ""
                  }`
              : task?.dueDate
                ? `Due ${format(new Date(task.dueDate), "EEEE, MMMM d")}`
                : "In Inbox · no date"}
          </div>
          <div>
            <span className="mb-1 block text-xs text-forest-400">Category</span>
            <CategoryChip categoryId={value.categoryId} categories={categories} />
          </div>
          {appointment?.location && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-forest-400" />
              <span>{appointment.location}</span>
            </div>
          )}
          <div>
            <span className="mb-1 block text-xs text-forest-400">Notes</span>
            {value.description?.trim() ? (
              <p className="whitespace-pre-wrap rounded-xl border border-forest-100 bg-white/70 p-3 leading-relaxed text-forest-700">
                {value.description}
              </p>
            ) : (
              <p className="text-forest-300">No notes added.</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onEdit(selection)}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest-600 px-4 py-2 text-sm text-cream-50 shadow-soft hover:bg-forest-700 sm:w-auto"
        >
          <Pencil className="h-4 w-4" />
          Edit {appointment ? "appointment" : "task"}
        </button>
      </div>
    </div>
  );
}
