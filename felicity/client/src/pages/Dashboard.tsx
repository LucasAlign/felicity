import { useState } from "react";
import {
  addDays,
  endOfDay,
  endOfWeek,
  format,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import {
  CalendarDays,
  type LucideIcon,
  NotebookPen,
  Plus,
  Sparkles,
  Sun,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useAppointments,
  useDeleteAppointment,
} from "@/hooks/useAppointments";
import { useDeleteTask, useTasks, useUpdateTask } from "@/hooks/useTasks";
import QuickAddDialog from "@/components/calendar/QuickAddDialog";
import BrainDumpDialog from "@/components/braindump/BrainDumpDialog";
import { getVerseOfTheDay } from "@/lib/bibleVerses";
import type { Appointment, Task } from "@shared/schema";

type AgendaEntry =
  | { kind: "task"; time: number; task: Task }
  | { kind: "appointment"; time: number; appointment: Appointment };

type Accent = "forest" | "haze";

const ACCENT_STYLES: Record<
  Accent,
  { badge: string; ring: string }
> = {
  forest: {
    badge: "bg-forest-600 text-cream-50",
    ring: "ring-forest-200/70",
  },
  haze: {
    badge: "bg-haze-500 text-cream-50",
    ring: "ring-haze-200/70",
  },
};

function buildEntries(
  tasks: Task[],
  appointments: Appointment[],
  range: { start: Date; end: Date },
): AgendaEntry[] {
  if (range.start > range.end) return [];

  const entries: AgendaEntry[] = [];

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const due = new Date(task.dueDate);
    if (!isWithinInterval(due, range)) continue;
    entries.push({ kind: "task", time: due.getTime(), task });
  }

  for (const appointment of appointments) {
    const start = new Date(appointment.startTime);
    if (!isWithinInterval(start, range)) continue;
    entries.push({ kind: "appointment", time: start.getTime(), appointment });
  }

  return entries.sort((a, b) => a.time - b.time);
}

function TaskEntryRow({ task }: { task: Task }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  function saveTitle() {
    setEditing(false);
    const trimmed = title.trim();
    if (!trimmed || trimmed === task.title) {
      setTitle(task.title);
      return;
    }
    updateTask.mutate({ id: task.id, data: { title: trimmed } });
  }

  return (
    <li className="flex items-start gap-3 -mx-3 px-3 py-3 rounded-xl transition-all hover:bg-white/80 hover:shadow-soft group">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() =>
          updateTask.mutate({ id: task.id, data: { completed: !task.completed } })
        }
        className="mt-1 h-4 w-4 accent-forest-600"
      />
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") {
                setTitle(task.title);
                setEditing(false);
              }
            }}
            className="w-full rounded-lg border border-forest-100 px-2 py-1 bg-white text-forest-700 text-sm"
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            className={`text-sm cursor-text truncate ${
              task.completed ? "text-forest-300 line-through" : "text-forest-700"
            }`}
          >
            {task.title}
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-forest-300" />
          <span className="text-xs text-forest-300">
            {task.dueDate
              ? `Due ${format(new Date(task.dueDate), "EEE, MMM d")}`
              : "Task"}
          </span>
        </div>
      </div>
      <button
        onClick={() => deleteTask.mutate(task.id)}
        className="text-forest-200 hover:text-walnut-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm mt-0.5"
        aria-label="Delete task"
      >
        ✕
      </button>
    </li>
  );
}

function AppointmentEntryRow({
  appointment,
  onEdit,
}: {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
}) {
  const deleteAppointment = useDeleteAppointment();

  return (
    <li className="flex items-start gap-3 -mx-3 px-3 py-3 rounded-xl transition-all hover:bg-white/80 hover:shadow-soft group">
      <div
        onClick={() => onEdit(appointment)}
        className="flex-1 min-w-0 cursor-pointer"
      >
        <div className="text-sm text-forest-700 truncate">{appointment.title}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-haze-400" />
          <span className="text-xs text-forest-300">
            {appointment.allDay
              ? "All day"
              : format(new Date(appointment.startTime), "EEE, MMM d — h:mma")}
            {appointment.location ? ` · ${appointment.location}` : ""}
          </span>
        </div>
      </div>
      <button
        onClick={() => deleteAppointment.mutate(appointment.id)}
        className="text-forest-200 hover:text-walnut-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm mt-0.5"
        aria-label="Delete appointment"
      >
        ✕
      </button>
    </li>
  );
}

function AgendaCard({
  title,
  icon: Icon,
  accent,
  entries,
  emptyMessage,
  onEditAppointment,
}: {
  title: string;
  icon: LucideIcon;
  accent: Accent;
  entries: AgendaEntry[];
  emptyMessage: string;
  onEditAppointment: (appointment: Appointment) => void;
}) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={`rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 ring-1 ${styles.ring} shadow-card p-6 transition-shadow hover:shadow-card-hover`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex items-center justify-center h-8 w-8 rounded-full shadow-soft ${styles.badge}`}
          >
            <Icon size={16} strokeWidth={2} />
          </span>
          <h3 className="text-forest-700 text-lg">{title}</h3>
        </div>
        {entries.length > 0 && (
          <span className="text-xs text-forest-400 bg-forest-50 rounded-full px-2.5 py-1">
            {entries.length}
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-forest-400 text-sm py-2">{emptyMessage}</p>
      ) : (
        <ul className="divide-y divide-forest-100/60">
          {entries.map((entry) =>
            entry.kind === "task" ? (
              <TaskEntryRow key={`task-${entry.task.id}`} task={entry.task} />
            ) : (
              <AppointmentEntryRow
                key={`appt-${entry.appointment.id}`}
                appointment={entry.appointment}
                onEdit={onEditAppointment}
              />
            ),
          )}
        </ul>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = (user as any)?.firstName;
  const { data: appointments = [] } = useAppointments();
  const { data: tasks = [] } = useTasks();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);

  const verse = getVerseOfTheDay();

  const now = new Date();
  const today = startOfDay(now);
  const todayRange = { start: today, end: endOfDay(today) };
  const weekRange = {
    start: startOfDay(addDays(today, 1)),
    end: endOfDay(endOfWeek(today)),
  };

  const todayEntries = buildEntries(tasks, appointments, todayRange);
  const weekEntries = buildEntries(tasks, appointments, weekRange);

  function handleEditAppointment(appointment: Appointment) {
    setEditingAppointment(appointment);
    setQuickAddOpen(true);
  }

  function handleCloseQuickAdd() {
    setQuickAddOpen(false);
    setEditingAppointment(null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl text-forest-700">
          Good morning{firstName ? `, ${firstName}` : ""}.
        </h2>
        <p className="text-forest-400 mt-1">
          Here's what's on your plate today.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setBrainDumpOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-walnut-500 text-cream-50 px-6 py-3 shadow-soft hover:shadow-soft-md hover:bg-walnut-600 transition-all"
        >
          <NotebookPen size={17} strokeWidth={2} />
          Start a Brain Dump
        </button>
        <button
          onClick={() => setQuickAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-white/70 border border-forest-200 text-forest-600 px-5 py-3 shadow-soft hover:shadow-soft-md hover:bg-forest-50 transition-all"
        >
          <Plus size={17} strokeWidth={2} />
          Quick add
        </button>
      </div>

      <div className="space-y-5">
        <AgendaCard
          title="What's Happening Today"
          icon={Sun}
          accent="forest"
          entries={todayEntries}
          emptyMessage="Nothing on your plate today — enjoy the quiet."
          onEditAppointment={handleEditAppointment}
        />

        <AgendaCard
          title="What's Happening This Week"
          icon={CalendarDays}
          accent="haze"
          entries={weekEntries}
          emptyMessage="Nothing else scheduled this week."
          onEditAppointment={handleEditAppointment}
        />

        <div className="rounded-2xl bg-gradient-to-br from-walnut-50/80 to-cream-100/60 backdrop-blur-sm border border-white/60 ring-1 ring-walnut-100/70 shadow-card p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-walnut-400 text-cream-50 shadow-soft">
              <Sparkles size={16} strokeWidth={2} />
            </span>
            <h3 className="text-forest-700 text-lg">Bible Verse</h3>
          </div>
          <blockquote className="font-serif text-base text-forest-600 italic leading-relaxed">
            "{verse.text}"
          </blockquote>
          <p className="mt-2 text-forest-400 not-italic">— {verse.reference}</p>
        </div>
      </div>

      <QuickAddDialog
        open={quickAddOpen}
        onClose={handleCloseQuickAdd}
        defaultDate={new Date()}
        editingAppointment={editingAppointment}
      />
      <BrainDumpDialog
        open={brainDumpOpen}
        onClose={() => setBrainDumpOpen(false)}
      />
    </div>
  );
}
