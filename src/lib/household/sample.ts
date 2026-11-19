import { addDays, startOfDay } from "./state";
import type { CalendarEvent } from "./types";

/**
 * Made-up calendar events laid out over the week starting today, standing in
 * for the real calendar until it is connected.
 */
export function sampleEvents(now: Date): CalendarEvent[] {
  const today = startOfDay(now);
  const on = (offset: number, hour: number, minute = 0) => {
    const d = addDays(today, offset);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute).toISOString();
  };
  const event = (
    id: string,
    title: string,
    offset: number,
    from: [number, number],
    to: [number, number],
    location?: string,
  ): CalendarEvent => ({ id, title, start: on(offset, ...from), end: on(offset, ...to), location });

  return [
    event("e1", "Dentist", 0, [9, 0], [10, 0], "Lakeview Dental"),
    event("e2", "Pick up dry cleaning", 0, [12, 30], [13, 0]),
    event("e3", "Late project review", 1, [16, 30], [18, 0]),
    event("e4", "Dinner with the Parkers", 2, [19, 0], [21, 30], "Lupa"),
    event("e5", "Hosting Sam and Jo", 4, [18, 30], [22, 0]),
    event("e6", "Farmers market", 5, [10, 0], [11, 0]),
  ];
}
