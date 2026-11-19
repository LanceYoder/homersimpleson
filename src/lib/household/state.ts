import type { CalendarEvent, HouseholdData, Recipe } from "./types";

/**
 * The household state: plain rules that turn the clock and the calendar into
 * "what is going on at home". Every screen reads from this, so the rules live
 * in one place. All times are the device's local time.
 */

/** When dinner is normally on the table, and the evening hours that decide it. */
export const DINNER_HOUR = 19;
const CORE_START_MIN = 18 * 60 + 30;
const CORE_END_MIN = 20 * 60;
const LATE_START_MIN = 17 * 60;

const LATE_END_MIN = 21 * 60 + 30;
/** An event must cover at least this much of the dinner hours to mean "out". */
const MIN_OUT_OVERLAP_MIN = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const HOSTING_TITLE = /^(we('re| are) )?host(ing)?\b|come over|coming over|at ours|at our place/i;
const HOME_LOCATION = /^(home|our place|our house)$/i;
const MEAL_TITLE = /\b(dinner|supper|reservation)\b/i;

export type Dinner =
  | { kind: "cook"; recipe: Recipe; startBy: Date; squeezedBy?: CalendarEvent }
  | { kind: "out"; event: CalendarEvent; skipped?: Recipe }
  | { kind: "hosting"; event: CalendarEvent; recipe?: Recipe }
  | { kind: "unplanned"; squeezedBy?: CalendarEvent };

export type Focus = "dinner" | "groceries" | "today";

export function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}

function atMinutes(day: Date, minutes: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
}

function overlaps(e: CalendarEvent, from: Date, to: Date): boolean {
  return new Date(e.start) < to && new Date(e.end) > from;
}

function overlapMinutes(e: CalendarEvent, from: Date, to: Date): number {
  const start = Math.max(+new Date(e.start), +from);
  const end = Math.min(+new Date(e.end), +to);
  return Math.max(0, end - start) / 60_000;
}

/** Guests at home. A location, when given, decides it; otherwise the title does. */
export function isHosting(e: CalendarEvent): boolean {
  const location = e.location?.trim() ?? "";
  if (location) return HOME_LOCATION.test(location);
  return HOSTING_TITLE.test(e.title.trim());
}

/** Events that touch the given local day, earliest first. */
export function eventsOn(day: Date, events: CalendarEvent[]): CalendarEvent[] {
  const from = startOfDay(day);
  const to = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  return events
    .filter((e) => overlaps(e, from, to))
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));
}

/**
 * What dinner looks like on a given day.
 * - An event covering at least half an hour of the core dinner hours means
 *   you are out, unless it reads as hosting at home. So does a later event
 *   that reads as a meal ("Dinner at Lupa" at 8pm).
 * - A shorter event, or one in the run-up to dinner, leaves dinner on but
 *   flags that whoever cooks may be starting late.
 * - One-day all-day events are markers and are ignored; an all-day event
 *   spanning several days (a trip) counts for each of its evenings.
 */
export function dinnerFor(day: Date, data: HouseholdData): Dinner {
  const spansDays = (e: CalendarEvent) => +new Date(e.end) - +new Date(e.start) > DAY_MS;
  const relevant = eventsOn(day, data.events).filter(
    (e) => (!e.allDay || spansDays(e)) && new Date(e.end) > new Date(e.start),
  );
  const coreFrom = atMinutes(day, CORE_START_MIN);
  const coreTo = atMinutes(day, CORE_END_MIN);

  const planned = data.mealPlan.find((m) => m.date === dateKey(day));
  const recipe = planned && data.recipes.find((r) => r.id === planned.recipeId);

  const duringDinner = relevant.filter((e) => overlapMinutes(e, coreFrom, coreTo) >= MIN_OUT_OVERLAP_MIN);
  const hosting = duringDinner.find(isHosting);
  if (hosting) return { kind: "hosting", event: hosting, recipe };
  if (duringDinner.length > 0) return { kind: "out", event: duringDinner[0], skipped: recipe };

  const lateMeal = relevant.find(
    (e) => !isHosting(e) && MEAL_TITLE.test(e.title) && overlaps(e, coreTo, atMinutes(day, LATE_END_MIN)),
  );
  if (lateMeal) return { kind: "out", event: lateMeal, skipped: recipe };

  const lateFrom = atMinutes(day, LATE_START_MIN);
  if (!recipe) return { kind: "unplanned", squeezedBy: relevant.find((e) => overlaps(e, lateFrom, coreTo)) };

  // Wall-clock arithmetic, so a long recipe can start before 5pm or the day before.
  const startBy = atMinutes(day, DINNER_HOUR * 60 - recipe.minutes);
  const squeezeFrom = startBy < lateFrom ? startBy : lateFrom;
  const squeezedBy = relevant.find((e) => overlaps(e, squeezeFrom, coreTo));
  return { kind: "cook", recipe, startBy, squeezedBy };
}

/** Which card leads the home screen right now. */
export function focusFor(now: Date): Focus {
  const hour = now.getHours();
  if (now.getDay() === 6 && hour < 14) return "groceries";
  if (hour >= 15 && hour < 21) return "dinner";
  return "today";
}

export type DayDinner = { day: Date; dinner: Dinner };

/** Dinner for today and the following days. */
export function weekDinners(now: Date, data: HouseholdData, days = 7): DayDinner[] {
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i);
    return { day, dinner: dinnerFor(day, data) };
  });
}

export type HouseholdState = {
  now: Date;
  focus: Focus;
  tonight: Dinner;
  week: DayDinner[];
  agenda: CalendarEvent[];
  groceriesLeft: number;
};

export function householdState(now: Date, data: HouseholdData): HouseholdState {
  const week = weekDinners(now, data);
  return {
    now,
    focus: focusFor(now),
    tonight: week[0].dinner,
    week,
    agenda: eventsOn(now, data.events),
    groceriesLeft: data.groceries.filter((g) => !g.done).length,
  };
}
