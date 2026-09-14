import { useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { useAppointments } from "@/hooks/useAppointments";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import MonthView from "@/components/calendar/MonthView";
import WeekView from "@/components/calendar/WeekView";
import DayView from "@/components/calendar/DayView";
import TasksPanel from "@/components/calendar/TasksPanel";
import UnassignedPanel from "@/components/calendar/UnassignedPanel";
import QuickAddDialog from "@/components/calendar/QuickAddDialog";
import GoogleCalendarPanel from "@/components/calendar/GoogleCalendarPanel";
import AgendaView from "@/components/calendar/AgendaView";
import ItemDetailSheet, {
  type CalendarSelection,
} from "@/components/calendar/ItemDetailSheet";
import { useCategories } from "@/hooks/useCategories";
import { useToast } from "@/components/Toast";
import type { Appointment, Task } from "@shared/schema";
import { MoreHorizontal } from "lucide-react";

type ViewMode = "agenda" | "month" | "week" | "day";

const VIEW_LABELS: Record<ViewMode, string> = {
  agenda: "Agenda",
  month: "Month",
  week: "Week",
  day: "Day",
};

const TITLE_FORMAT: Record<ViewMode, string> = {
  agenda: "MMMM yyyy",
  month: "MMMM yyyy",
  week: "MMMM yyyy",
  day: "EEEE, MMMM d",
};

export default function Calendar() {
  const [view, setView] = useState<ViewMode>(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
      ? "agenda"
      : "month",
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  // The date the quick-add modal pre-fills. Driven by which day was clicked in
  // the month grid (#3), falling back to the currently-viewed date otherwise.
  const [quickAddDate, setQuickAddDate] = useState(new Date());
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selection, setSelection] = useState<CalendarSelection | null>(null);
  const [mobileList, setMobileList] = useState<"inbox" | "tasks">("inbox");
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  const { data: appointments = [], isLoading: appointmentsLoading } =
    useAppointments();
  const { data: tasks = [] } = useTasks();
  const { data: categories = [] } = useCategories();
  const updateTask = useUpdateTask();
  const { toast } = useToast();

  // Dropping an unassigned task onto a day schedules it for that date (#4).
  // Local midnight (not `new Date(day)`) matches how the quick-add form stores
  // a due date, so it lands on the intended day west of UTC.
  function handleAssignTask(taskId: number, day: Date) {
    const dueDate = new Date(`${format(day, "yyyy-MM-dd")}T00:00:00`);
    const task = tasks.find((t) => t.id === taskId);
    const previousDue = task?.dueDate ?? null;
    updateTask.mutate({ id: taskId, data: { dueDate } });
    // Confirm the drop landed (the month grid doesn't show a task chip on its
    // own), and offer a one-tap undo back to the prior due date. (#20)
    toast({
      message: `Scheduled for ${format(day, "EEE, MMM d")}.`,
      action: {
        label: "Undo",
        onClick: () =>
          updateTask.mutate({ id: taskId, data: { dueDate: previousDue } }),
      },
    });
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function goPrev() {
    if (view === "agenda") setCurrentDate((d) => subWeeks(d, 2));
    else if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  }

  function goNext() {
    if (view === "agenda") setCurrentDate((d) => addWeeks(d, 2));
    else if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  }

  // Clicking a day opens the quick-add modal pre-filled with that date rather
  // than dropping into day view (#3). Day view is still reachable via the
  // Month/Week/Day switcher.
  function handleSelectDay(day: Date) {
    setEditingAppointment(null);
    setEditingTask(null);
    setQuickAddDate(day);
    setQuickAddOpen(true);
  }

  function handleSelectAppointment(appointment: Appointment) {
    setSelection({ kind: "appointment", value: appointment });
  }

  function handleSelectTask(task: Task) {
    setSelection({ kind: "task", value: task });
  }

  function handleScheduleTask(task: Task) {
    setSelection(null);
    setEditingAppointment(null);
    setEditingTask(task);
    setQuickAddOpen(true);
  }

  function handleEditSelection(item: CalendarSelection) {
    setSelection(null);
    if (item.kind === "appointment") {
      setEditingTask(null);
      setEditingAppointment(item.value);
    } else {
      setEditingAppointment(null);
      setEditingTask(item.value);
    }
    setQuickAddOpen(true);
  }

  function handleCloseQuickAdd() {
    setQuickAddOpen(false);
    setEditingAppointment(null);
    setEditingTask(null);
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="text-3xl text-forest-700">
            {format(currentDate, TITLE_FORMAT[view])}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="order-1 flex min-w-0 flex-1 items-center overflow-hidden rounded-lg border border-forest-100 sm:order-none sm:flex-none">
            <button
              onClick={goPrev}
              className="min-h-11 px-3 py-1.5 text-forest-500 hover:bg-forest-50 sm:min-h-0"
              aria-label="Previous"
            >
              &larr;
            </button>
            <button
              onClick={goToday}
              className="min-h-11 flex-1 border-x border-forest-100 px-3 py-1.5 text-sm text-forest-500 hover:bg-forest-50 sm:min-h-0 sm:flex-none"
            >
              Today
            </button>
            <button
              onClick={goNext}
              className="min-h-11 px-3 py-1.5 text-forest-500 hover:bg-forest-50 sm:min-h-0"
              aria-label="Next"
            >
              &rarr;
            </button>
          </div>

          <div className="order-3 flex w-full items-center overflow-hidden rounded-lg border border-forest-100 sm:order-none sm:w-auto">
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`min-h-11 flex-1 px-2 py-1.5 text-sm sm:min-h-0 sm:flex-none sm:px-3 ${
                  view === mode
                    ? "bg-forest-600 text-cream-50"
                    : "text-forest-500 hover:bg-forest-50"
                }`}
              >
                {VIEW_LABELS[mode]}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setEditingAppointment(null);
              setEditingTask(null);
              setQuickAddDate(currentDate);
              setQuickAddOpen(true);
            }}
            className="order-2 min-h-11 rounded-lg bg-walnut-500 px-4 py-1.5 text-sm text-cream-50 shadow-soft transition-colors hover:bg-walnut-600 sm:order-none sm:min-h-0"
          >
            + Add
          </button>

          <div className="relative order-2 sm:hidden">
            <button
              type="button"
              onClick={() => setMobileSettingsOpen((open) => !open)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-forest-100 text-forest-500"
              aria-label="Calendar settings"
              aria-expanded={mobileSettingsOpen}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {mobileSettingsOpen && (
              <div className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-forest-100 bg-cream-50 p-4 shadow-soft-md">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-forest-400">Calendar settings</p>
                <GoogleCalendarPanel />
              </div>
            )}
          </div>

          <div className="hidden sm:block"><GoogleCalendarPanel /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_16rem] gap-5 items-start">
        {appointmentsLoading ? (
          <div className="text-forest-400">Loading calendar&hellip;</div>
        ) : (
          <>
            {view === "agenda" && (
              <AgendaView
                currentDate={currentDate}
                appointments={appointments}
                tasks={tasks}
                onSelectAppointment={handleSelectAppointment}
                onSelectTask={handleSelectTask}
              />
            )}
            {view === "month" && (
              <MonthView
                currentDate={currentDate}
                appointments={appointments}
                tasks={tasks}
                onSelectDay={handleSelectDay}
                onAssignTask={handleAssignTask}
                onSelectAppointment={handleSelectAppointment}
                onSelectTask={handleSelectTask}
              />
            )}
            {view === "week" && (
              <WeekView
                currentDate={currentDate}
                appointments={appointments}
                onSelectAppointment={handleSelectAppointment}
              />
            )}
            {view === "day" && (
              <DayView
                currentDate={currentDate}
                appointments={appointments}
                onSelectAppointment={handleSelectAppointment}
              />
            )}
          </>
        )}

        <div className="hidden space-y-5 lg:block">
          {view === "month" && (
            <UnassignedPanel tasks={tasks} onScheduleTask={handleScheduleTask} />
          )}
          <TasksPanel
            tasks={tasks}
            onSelectTask={handleSelectTask}
            excludeUnassigned={view === "month"}
          />
        </div>
      </div>

      <div className="lg:hidden">
        <div className="mb-3 flex overflow-hidden rounded-lg border border-forest-100 bg-white/60">
          {(["inbox", "tasks"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMobileList(mode)}
              className={`min-h-11 flex-1 text-sm capitalize ${
                mobileList === mode
                  ? "bg-forest-600 text-cream-50"
                  : "text-forest-500"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        {mobileList === "inbox" ? (
          <UnassignedPanel tasks={tasks} onScheduleTask={handleScheduleTask} />
        ) : (
          <TasksPanel tasks={tasks} onSelectTask={handleSelectTask} excludeUnassigned />
        )}
      </div>

      <QuickAddDialog
        open={quickAddOpen}
        onClose={handleCloseQuickAdd}
        defaultDate={quickAddDate}
        editingAppointment={editingAppointment}
        editingTask={editingTask}
      />
      <ItemDetailSheet
        selection={selection}
        categories={categories}
        onClose={() => setSelection(null)}
        onEdit={handleEditSelection}
      />
    </div>
  );
}
