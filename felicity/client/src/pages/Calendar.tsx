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
import type { Appointment, Task } from "@shared/schema";

type ViewMode = "month" | "week" | "day";

const VIEW_LABELS: Record<ViewMode, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
};

const TITLE_FORMAT: Record<ViewMode, string> = {
  month: "MMMM yyyy",
  week: "MMMM yyyy",
  day: "EEEE, MMMM d",
};

export default function Calendar() {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  // The date the quick-add modal pre-fills. Driven by which day was clicked in
  // the month grid (#3), falling back to the currently-viewed date otherwise.
  const [quickAddDate, setQuickAddDate] = useState(new Date());
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { data: appointments = [], isLoading: appointmentsLoading } =
    useAppointments();
  const { data: tasks = [] } = useTasks();
  const updateTask = useUpdateTask();

  // Dropping an unassigned task onto a day schedules it for that date (#4).
  // Local midnight (not `new Date(day)`) matches how the quick-add form stores
  // a due date, so it lands on the intended day west of UTC.
  function handleAssignTask(taskId: number, day: Date) {
    const dueDate = new Date(`${format(day, "yyyy-MM-dd")}T00:00:00`);
    updateTask.mutate({ id: taskId, data: { dueDate } });
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function goPrev() {
    if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  }

  function goNext() {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
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
    setEditingTask(null);
    setEditingAppointment(appointment);
    setQuickAddOpen(true);
  }

  function handleEditTask(task: Task) {
    setEditingAppointment(null);
    setEditingTask(task);
    setQuickAddOpen(true);
  }

  function handleCloseQuickAdd() {
    setQuickAddOpen(false);
    setEditingAppointment(null);
    setEditingTask(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl text-forest-700">
            {format(currentDate, TITLE_FORMAT[view])}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-forest-100 overflow-hidden">
            <button
              onClick={goPrev}
              className="px-3 py-1.5 text-forest-500 hover:bg-forest-50"
              aria-label="Previous"
            >
              &larr;
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-sm text-forest-500 hover:bg-forest-50 border-x border-forest-100"
            >
              Today
            </button>
            <button
              onClick={goNext}
              className="px-3 py-1.5 text-forest-500 hover:bg-forest-50"
              aria-label="Next"
            >
              &rarr;
            </button>
          </div>

          <div className="flex items-center rounded-lg border border-forest-100 overflow-hidden">
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`px-3 py-1.5 text-sm ${
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
            className="rounded-lg bg-walnut-500 text-cream-50 px-4 py-1.5 text-sm shadow-soft hover:bg-walnut-600 transition-colors"
          >
            + Add
          </button>

          <GoogleCalendarPanel />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_16rem] gap-5 items-start">
        {appointmentsLoading ? (
          <div className="text-forest-400">Loading calendar&hellip;</div>
        ) : (
          <>
            {view === "month" && (
              <MonthView
                currentDate={currentDate}
                appointments={appointments}
                onSelectDay={handleSelectDay}
                onAssignTask={handleAssignTask}
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

        <div className="space-y-5">
          {view === "month" && <UnassignedPanel tasks={tasks} />}
          <TasksPanel tasks={tasks} onEditTask={handleEditTask} />
        </div>
      </div>

      <QuickAddDialog
        open={quickAddOpen}
        onClose={handleCloseQuickAdd}
        defaultDate={quickAddDate}
        editingAppointment={editingAppointment}
        editingTask={editingTask}
      />
    </div>
  );
}
