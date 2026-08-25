import { format, isSameDay, isToday } from "date-fns";
import type { Appointment } from "@shared/schema";
import { GRID_HOURS, HOUR_HEIGHT, formatHour, timeGridStyle } from "@/lib/calendar";
import { useCategories } from "@/hooks/useCategories";
import { colorForCategory } from "@/lib/categories";

export default function TimeGrid({
  days,
  appointments,
  onSelectAppointment,
}: {
  days: Date[];
  appointments: Appointment[];
  onSelectAppointment: (appointment: Appointment) => void;
}) {
  const { data: categories = [] } = useCategories();
  const allDayAppointments = appointments.filter((a) => a.allDay);
  const timedAppointments = appointments.filter((a) => !a.allDay);

  return (
    <div className="rounded-2xl bg-white/70 border border-forest-100 shadow-soft overflow-hidden">
      <div
        className="grid border-b border-forest-100"
        style={{ gridTemplateColumns: `4rem repeat(${days.length}, 1fr)` }}
      >
        <div />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="px-2 py-2 text-center border-l border-forest-50"
          >
            <div className="text-xs text-forest-400">{format(day, "EEE")}</div>
            <div
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                isToday(day) ? "bg-forest-600 text-cream-50" : "text-forest-600"
              }`}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {allDayAppointments.length > 0 && (
        <div
          className="grid border-b border-forest-100"
          style={{ gridTemplateColumns: `4rem repeat(${days.length}, 1fr)` }}
        >
          <div className="text-xs text-forest-300 px-2 py-1">All day</div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="border-l border-forest-50 p-1 space-y-1"
            >
              {allDayAppointments
                .filter((a) => isSameDay(new Date(a.startTime), day))
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onSelectAppointment(a)}
                    className="w-full truncate rounded bg-walnut-100 px-1.5 py-0.5 text-xs text-walnut-700 text-left"
                    title={
                      a.source === "google_calendar"
                        ? "Synced with Google Calendar"
                        : undefined
                    }
                  >
                    <span
                      className="mr-1 inline-block h-2 w-2 shrink-0 rounded-full align-middle"
                      style={{
                        backgroundColor: colorForCategory(a.categoryId, categories),
                      }}
                      aria-hidden="true"
                    />
                    {a.source === "google_calendar" && "● "}
                    {a.title}
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}

      <div className="overflow-y-auto max-h-[32rem]">
        <div
          className="grid relative"
          style={{ gridTemplateColumns: `4rem repeat(${days.length}, 1fr)` }}
        >
          <div>
            {GRID_HOURS.map((hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="text-right pr-2 text-xs text-forest-300 -translate-y-2"
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="relative border-l border-forest-50"
            >
              {GRID_HOURS.map((hour) => (
                <div
                  key={hour}
                  style={{ height: HOUR_HEIGHT }}
                  className="border-b border-forest-50/70"
                />
              ))}

              {timedAppointments
                .filter((a) => isSameDay(new Date(a.startTime), day))
                .map((a) => {
                  const { top, height } = timeGridStyle(
                    new Date(a.startTime),
                    a.endTime ? new Date(a.endTime) : null,
                  );
                  return (
                    <button
                      key={a.id}
                      onClick={() => onSelectAppointment(a)}
                      style={{ top, height }}
                      className="absolute left-0.5 right-0.5 rounded-md bg-forest-500 text-cream-50 text-left px-1.5 py-0.5 text-xs shadow-soft overflow-hidden hover:bg-forest-600 transition-colors"
                      title={
                        a.source === "google_calendar"
                          ? "Synced with Google Calendar"
                          : undefined
                      }
                    >
                      <div className="font-medium truncate">
                        <span
                          className="mr-1 inline-block h-2 w-2 shrink-0 rounded-full align-middle ring-1 ring-white/60"
                          style={{
                            backgroundColor: colorForCategory(
                              a.categoryId,
                              categories,
                            ),
                          }}
                          aria-hidden="true"
                        />
                        {a.source === "google_calendar" && "● "}
                        {a.title}
                      </div>
                      <div className="opacity-80 truncate">
                        {format(new Date(a.startTime), "h:mma")}
                      </div>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
