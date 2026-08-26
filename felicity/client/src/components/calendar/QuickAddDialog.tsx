import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { Appointment, Task } from "@shared/schema";
import {
  useCreateAppointment,
  useDeleteAppointment,
  useUpdateAppointment,
} from "@/hooks/useAppointments";
import {
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
} from "@/hooks/useTasks";
import { useCategories } from "@/hooks/useCategories";
import { colorForCategory } from "@/lib/categories";

type EntryType = "appointment" | "task";

function toDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function toTimeInput(date: Date): string {
  return format(date, "HH:mm");
}

export default function QuickAddDialog({
  open,
  onClose,
  defaultDate,
  editingAppointment,
  editingTask = null,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: Date;
  editingAppointment: Appointment | null;
  editingTask?: Task | null;
}) {
  const [entryType, setEntryType] = useState<EntryType>("appointment");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(toDateInput(defaultDate));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const { data: categories = [] } = useCategories();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    if (!open) return;

    if (editingTask) {
      setEntryType("task");
      setTitle(editingTask.title);
      setDate(
        editingTask.dueDate ? toDateInput(new Date(editingTask.dueDate)) : "",
      );
      setCategoryId(editingTask.categoryId ?? null);
    } else if (editingAppointment) {
      setEntryType("appointment");
      setTitle(editingAppointment.title);
      setDate(toDateInput(new Date(editingAppointment.startTime)));
      setStartTime(toTimeInput(new Date(editingAppointment.startTime)));
      setEndTime(
        editingAppointment.endTime
          ? toTimeInput(new Date(editingAppointment.endTime))
          : "",
      );
      setAllDay(editingAppointment.allDay);
      setLocation(editingAppointment.location ?? "");
      setCategoryId(editingAppointment.categoryId ?? null);
    } else {
      setEntryType("appointment");
      setTitle("");
      setDate(toDateInput(defaultDate));
      setStartTime("09:00");
      setEndTime("");
      setAllDay(false);
      setLocation("");
      setCategoryId(null);
    }
  }, [open, editingAppointment, editingTask, defaultDate]);

  if (!open) return null;

  const isEditingAppointment = !!editingAppointment;
  const isEditingTask = !!editingTask;
  const isEditing = isEditingAppointment || isEditingTask;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    if (entryType === "task") {
      const taskData = {
        title,
        dueDate: date ? new Date(date) : null,
        categoryId,
      };
      if (isEditingTask && editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, data: taskData });
      } else {
        await createTask.mutateAsync({
          ...taskData,
          source: "manual_entry",
        } as any);
      }
      onClose();
      return;
    }

    const startDateTime = allDay
      ? new Date(`${date}T00:00:00`)
      : new Date(`${date}T${startTime || "09:00"}:00`);
    const endDateTime = endTime ? new Date(`${date}T${endTime}:00`) : null;

    const payload = {
      title,
      startTime: startDateTime,
      endTime: endDateTime,
      allDay,
      location: location || null,
      categoryId,
      source: "manual_entry" as const,
    };

    if (isEditing && editingAppointment) {
      await updateAppointment.mutateAsync({
        id: editingAppointment.id,
        data: payload,
      });
    } else {
      await createAppointment.mutateAsync(payload as any);
    }
    onClose();
  }

  async function handleDelete() {
    if (isEditingTask && editingTask) {
      await deleteTask.mutateAsync(editingTask.id);
    } else if (editingAppointment) {
      await deleteAppointment.mutateAsync(editingAppointment.id);
    } else {
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-cream-50 p-6 shadow-soft">
        <h3 className="text-xl text-forest-700 mb-4">
          {isEditingTask
            ? "Edit task"
            : isEditingAppointment
              ? "Edit appointment"
              : "Quick add"}
        </h3>

        {!isEditing && (
          <div className="flex items-center rounded-lg border border-forest-100 overflow-hidden mb-4 w-fit">
            {(["appointment", "task"] as EntryType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setEntryType(t)}
                className={`px-4 py-1.5 text-sm capitalize ${
                  entryType === t
                    ? "bg-forest-600 text-cream-50"
                    : "text-forest-500 hover:bg-forest-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-forest-500 mb-1">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-forest-100 px-3 py-2 bg-white/80 text-forest-700"
              placeholder={
                entryType === "task" ? "Pick up dry cleaning" : "Dentist appointment"
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm text-forest-500 mb-1">Category</label>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 rounded-full border border-forest-100 shrink-0"
                style={{ backgroundColor: colorForCategory(categoryId, categories) }}
                aria-hidden="true"
              />
              <select
                value={categoryId ?? ""}
                onChange={(e) =>
                  setCategoryId(e.target.value ? Number(e.target.value) : null)
                }
                className="flex-1 rounded-lg border border-forest-100 px-3 py-2 bg-white/80 text-forest-700"
              >
                <option value="">Unassigned</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? "— " : ""}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-forest-500 mb-1">
              {entryType === "task" ? "Due date (optional)" : "Date"}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-forest-100 px-3 py-2 bg-white/80 text-forest-700"
              required={entryType === "appointment"}
            />
          </div>

          {entryType === "appointment" && (
            <>
              <label className="flex items-center gap-2 text-sm text-forest-500">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="accent-forest-600"
                />
                All day
              </label>

              {!allDay && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm text-forest-500 mb-1">
                      Start
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-lg border border-forest-100 px-3 py-2 bg-white/80 text-forest-700"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-forest-500 mb-1">
                      End (optional)
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-lg border border-forest-100 px-3 py-2 bg-white/80 text-forest-700"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-forest-500 mb-1">
                  Location (optional)
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-forest-100 px-3 py-2 bg-white/80 text-forest-700"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-sm text-walnut-500 hover:text-walnut-700"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm text-forest-400 hover:bg-forest-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-forest-600 text-cream-50 px-4 py-2 text-sm shadow-soft hover:bg-forest-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
