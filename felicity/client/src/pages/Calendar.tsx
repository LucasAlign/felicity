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
import { useTasks } from "@/hooks/useTasks";
import MonthView from "@/components/calendar/MonthView";
import WeekView from "@/components/calendar/WeekView";
import DayView from "@/components/calendar/DayView";
import TasksPanel from "@/components/calendar/TasksPanel";
import QuickAddDialog from "@/components/calendar/QuickAddDialog";
import type { Appointment } from "@shared/schema";

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
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);

  const { data: appointments = [], isLoading: appointmentsLoading } =
    useAppointments();
  const { data: tasks = [] } = useTasks();

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

  function handleSelectDay(day: Date) {
    setCurrentDate(day);
    setView("day");
  }

  function handleSelectAppointment(appointment: Appointment) {
    setEditingAppointment(appointment);
    setQuickAddOpen(true);
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
              setQuickAddOpen(true);
            }}
            className="rounded-lg bg-walnut-500 text-cream-50 px-4 py-1.5 text-sm shadow-soft hover:bg-walnut-600 transition-colors"
          >
            + Add
          </button>
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

        <TasksPanel tasks={tasks} />
      </div>

      <QuickAddDialog
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        defaultDate={currentDate}
        editingAppointment={editingAppointment}
      />
    </div>
  );
}
