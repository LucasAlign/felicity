import { format, subDays, subHours } from "date-fns";
import type { Appointment } from "@shared/schema";
import { storage } from "./storage";

// Regenerates the reminder notifications for one appointment. Called after
// create/update so a changed startTime always reflects the right reminder
// times; the old rows are cleared first since there's no cheap way to know
// which reminder (if any) still matches the new time.
export async function syncAppointmentReminders(
  userId: string,
  appointment: Appointment,
): Promise<void> {
  await storage.deleteNotificationsForAppointment(appointment.id);

  if (appointment.allDay) return;

  const now = new Date();
  const startTime = new Date(appointment.startTime);
  const timeLabel = format(startTime, "h:mma");

  const candidates = [
    {
      remindAt: subDays(startTime, 1),
      message: `${appointment.title} is tomorrow at ${timeLabel}.`,
    },
    {
      remindAt: subHours(startTime, 1),
      message: `${appointment.title} is in 1 hour.`,
    },
  ];

  for (const c of candidates) {
    if (c.remindAt <= now) continue;
    await storage.createNotification(userId, {
      type: "appointment_reminder",
      appointmentId: appointment.id,
      message: c.message,
      remindAt: c.remindAt,
    });
  }
}
