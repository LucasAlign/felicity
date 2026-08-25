import { format, subDays, subHours } from "date-fns";
import type { Appointment, InsertNotification } from "@shared/schema";
import { storage } from "./storage";

// Regenerates the reminder notifications for one appointment. Called after
// create/update so a changed startTime always reflects the right reminder
// times. The old rows are swapped for the new set atomically (single
// transaction) so an interrupted sync can't leave the appointment with its
// reminders half-deleted. An all-day appointment ends up with none (empty set).
export async function syncAppointmentReminders(
  userId: string,
  appointment: Appointment,
): Promise<void> {
  const rows: InsertNotification[] = [];

  if (!appointment.allDay) {
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
      rows.push({
        type: "appointment_reminder",
        appointmentId: appointment.id,
        message: c.message,
        remindAt: c.remindAt,
      });
    }
  }

  await storage.replaceAppointmentReminders(userId, appointment.id, rows);
}
