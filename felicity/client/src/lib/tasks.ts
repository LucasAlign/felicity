import type { Task } from "@shared/schema";

// A completed task stays visible (crossed off) for this long, then drops out of
// the active list into the archive. Keeps just-finished items on screen for a
// beat without letting them pile up. See issue #8.
export const ARCHIVE_AFTER_MS = 12 * 60 * 60 * 1000; // 12 hours

// Completed within the last 12h → still shown, struck through.
export function isRecentlyCompleted(task: Task, now: Date = new Date()): boolean {
  if (!task.completed) return false;
  if (!task.completedAt) return false; // completed before this feature existed
  return now.getTime() - new Date(task.completedAt).getTime() < ARCHIVE_AFTER_MS;
}

// Completed and past the 12h window (or completed with no timestamp) → archived
// and hidden from the active list.
export function isArchived(task: Task, now: Date = new Date()): boolean {
  return task.completed && !isRecentlyCompleted(task, now);
}

// The active list: everything not yet archived — open tasks plus tasks
// finished within the last 12h. Open tasks sort by due date (undated last);
// recently-completed tasks sink to the bottom.
export function activeTasks(tasks: Task[], now: Date = new Date()): Task[] {
  return tasks
    .filter((t) => !isArchived(t, now))
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
    });
}
