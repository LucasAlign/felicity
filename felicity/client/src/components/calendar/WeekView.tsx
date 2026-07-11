import { eachDayOfInterval, endOfWeek, startOfWeek } from "date-fns";
import type { Appointment } from "@shared/schema";
import TimeGrid from "./TimeGrid";

export default function WeekView({
  currentDate,
  appointments,
  onSelectAppointment,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onSelectAppointment: (appointment: Appointment) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(currentDate),
    end: endOfWeek(currentDate),
  });

  return (
    <TimeGrid
      days={days}
      appointments={appointments}
      onSelectAppointment={onSelectAppointment}
    />
  );
}
