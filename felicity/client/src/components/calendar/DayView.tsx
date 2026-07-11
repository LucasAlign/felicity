import type { Appointment } from "@shared/schema";
import TimeGrid from "./TimeGrid";

export default function DayView({
  currentDate,
  appointments,
  onSelectAppointment,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onSelectAppointment: (appointment: Appointment) => void;
}) {
  return (
    <TimeGrid
      days={[currentDate]}
      appointments={appointments}
      onSelectAppointment={onSelectAppointment}
    />
  );
}
