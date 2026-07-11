export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 22;
export const HOUR_HEIGHT = 48;

export const GRID_HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, i) => DAY_START_HOUR + i,
);

export function timeGridStyle(start: Date, end: Date | null) {
  const startOffset =
    start.getHours() - DAY_START_HOUR + start.getMinutes() / 60;
  const endDate = end ?? new Date(start.getTime() + 30 * 60 * 1000);
  const endOffset = end
    ? endDate.getHours() - DAY_START_HOUR + endDate.getMinutes() / 60
    : startOffset + 0.5;

  const top = Math.max(0, startOffset * HOUR_HEIGHT);
  const height = Math.max(20, (endOffset - startOffset) * HOUR_HEIGHT);

  return { top, height };
}

export function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}
