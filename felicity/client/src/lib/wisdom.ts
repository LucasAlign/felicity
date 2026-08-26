import { getDayOfYear } from "date-fns";
import type { WisdomEntry } from "@shared/schema";

// Pick one wisdom entry for the given day, rotating by day-of-year so it's
// stable all day and cycles through the list rather than repeating — the same
// scheme as getVerseOfTheDay. Returns null when the user has no entries. (#15)
export function wisdomOfTheDay(
  entries: WisdomEntry[],
  date: Date = new Date(),
): WisdomEntry | null {
  if (entries.length === 0) return null;
  const index = getDayOfYear(date) % entries.length;
  return entries[index];
}
