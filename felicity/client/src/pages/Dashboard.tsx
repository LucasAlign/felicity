import { useState } from "react";
import { format, isToday } from "date-fns";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useAppointments } from "@/hooks/useAppointments";
import { useTasks } from "@/hooks/useTasks";
import QuickAddDialog from "@/components/calendar/QuickAddDialog";
import BrainDumpDialog from "@/components/braindump/BrainDumpDialog";

function WidgetCard({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/70 border border-forest-100 p-5 shadow-soft">
      <h3 className="text-forest-600 text-lg mb-2">{title}</h3>
      <div className="text-forest-400 text-sm">
        {children ?? "Coming soon."}
      </div>
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

  const todaysAppointments = appointments
    .filter((a) => isToday(new Date(a.startTime)))
    .sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  const openTaskCount = tasks.filter((t) => !t.completed).length;

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
          className="rounded-xl bg-walnut-500 text-cream-50 px-6 py-3 shadow-soft hover:bg-walnut-600 transition-colors"
        >
          Start a Brain Dump
        </button>
        <button
          onClick={() => setQuickAddOpen(true)}
          className="rounded-xl border border-forest-200 text-forest-600 px-5 py-3 hover:bg-forest-50 transition-colors"
        >
          Quick add
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <WidgetCard title="Today's Big Three" />

        <WidgetCard title="Today's Appointments">
          {todaysAppointments.length === 0 ? (
            "Nothing on the calendar today."
          ) : (
            <ul className="space-y-1.5">
              {todaysAppointments.map((a) => (
                <li key={a.id} className="text-forest-600">
                  {a.allDay ? "All day" : format(new Date(a.startTime), "h:mma")}
                  {" — "}
                  {a.title}
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/calendar"
            className="inline-block mt-3 text-forest-500 hover:text-forest-700 underline"
          >
            Open calendar
          </Link>
        </WidgetCard>

        <WidgetCard title="What's On Fire Today">
          {openTaskCount === 0
            ? "Nothing urgent right now."
            : `You have a few unscheduled tasks.`}
        </WidgetCard>

        <WidgetCard title="Bible Verse" />
      </div>

      <QuickAddDialog
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        defaultDate={new Date()}
        editingAppointment={null}
      />
      <BrainDumpDialog
        open={brainDumpOpen}
        onClose={() => setBrainDumpOpen(false)}
      />
    </div>
  );
}
