import { describe, expect, it } from "vitest";
import { dateKey, dinnerFor, focusFor, householdState, weekDinners } from "./state";
import type { CalendarEvent, HouseholdData } from "./types";

// Wednesday 11 November 2026.
const day = new Date(2026, 10, 11);
const at = (h: number, m = 0, d = day) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).toISOString();

const event = (title: string, from: [number, number], to: [number, number], extra: Partial<CalendarEvent> = {}) => ({
  id: title,
  title,
  start: at(...from),
  end: at(...to),
  ...extra,
});

const base: HouseholdData = {
  events: [],
  recipes: [{ id: "r1", title: "Lemon chicken", minutes: 40, effort: "standard", ingredients: [] }],
  mealPlan: [{ date: dateKey(day), recipeId: "r1" }],
  groceries: [
    { id: "g1", name: "Lemons", aisle: "Produce", done: false },
    { id: "g2", name: "Rice", aisle: "Pantry", done: true },
  ],
};

describe("dinnerFor", () => {
  it("is the planned recipe on a free evening, with a start time", () => {
    const d = dinnerFor(day, base);
    expect(d.kind).toBe("cook");
    if (d.kind !== "cook") return;
    expect(d.recipe.id).toBe("r1");
    expect([d.startBy.getHours(), d.startBy.getMinutes()]).toEqual([18, 20]);
    expect(d.squeezedBy).toBeUndefined();
  });

  it("is out when an event covers dinner time, and reports the skipped recipe", () => {
    const d = dinnerFor(day, { ...base, events: [event("Dinner at Lupa", [19, 0], [21, 0])] });
    expect(d.kind).toBe("out");
    if (d.kind === "out") expect(d.skipped?.id).toBe("r1");
  });

  it("is hosting when the event reads as guests at home", () => {
    const byTitle = dinnerFor(day, { ...base, events: [event("Hosting Sam and Jo", [18, 30], [22, 0])] });
    const byPlace = dinnerFor(day, {
      ...base,
      events: [event("Dinner with Sam and Jo", [18, 30], [22, 0], { location: "Home" })],
    });
    expect(byTitle.kind).toBe("hosting");
    expect(byPlace.kind).toBe("hosting");
  });

  it("keeps dinner on but flags a late start when an event runs into early evening", () => {
    const d = dinnerFor(day, { ...base, events: [event("Late meeting", [16, 30], [18, 0])] });
    expect(d.kind).toBe("cook");
    if (d.kind === "cook") expect(d.squeezedBy?.title).toBe("Late meeting");
  });

  it("ignores daytime and all-day events", () => {
    const d = dinnerFor(day, {
      ...base,
      events: [event("Dentist", [9, 0], [10, 0]), event("Trash day", [0, 0], [23, 59], { allDay: true })],
    });
    expect(d.kind).toBe("cook");
  });

  it("treats a short or early-ending evening event as a late start, not out", () => {
    for (const e of [event("Gym", [17, 0], [18, 45]), event("Call mom", [19, 0], [19, 10])]) {
      const d = dinnerFor(day, { ...base, events: [e] });
      expect(d.kind).toBe("cook");
      if (d.kind === "cook") expect(d.squeezedBy?.title).toBe(e.title);
    }
  });

  it("ignores zero-length reminders", () => {
    const d = dinnerFor(day, { ...base, events: [event("Take bins out", [19, 0], [19, 0])] });
    expect(d).toMatchObject({ kind: "cook", squeezedBy: undefined });
  });

  it("is out for a late event that reads as a meal, but not for other late events", () => {
    expect(dinnerFor(day, { ...base, events: [event("Dinner at Lupa", [20, 0], [22, 0])] }).kind).toBe("out");
    expect(dinnerFor(day, { ...base, events: [event("Movie", [20, 0], [22, 0])] }).kind).toBe("cook");
  });

  it("does not read someone else hosting, or unrelated uses of the word, as hosting", () => {
    const away = dinnerFor(day, {
      ...base,
      events: [event("Hosting game night", [18, 30], [22, 0], { location: "Sam's place" })],
    });
    const other = dinnerFor(day, { ...base, events: [event("Sam is hosting game night", [18, 30], [22, 0])] });
    const admin = dinnerFor(day, { ...base, events: [event("Web hosting renewal", [19, 0], [20, 0])] });
    expect([away.kind, other.kind, admin.kind]).toEqual(["out", "out", "out"]);
  });

  it("flags an afternoon event against a long recipe's start time", () => {
    const data: HouseholdData = {
      ...base,
      recipes: [{ id: "r1", title: "Short ribs", minutes: 180, effort: "involved", ingredients: [] }],
      events: [event("School pickup", [15, 30], [16, 30])],
    };
    const d = dinnerFor(day, data);
    expect(d.kind).toBe("cook");
    if (d.kind !== "cook") return;
    expect(d.startBy.getHours()).toBe(16);
    expect(d.squeezedBy?.title).toBe("School pickup");
  });

  it("counts a multi-day all-day trip as out on each of its evenings only", () => {
    const fri = new Date(2026, 10, 13);
    const trip: CalendarEvent = {
      id: "trip",
      title: "Trip to Chicago",
      start: new Date(2026, 10, 13).toISOString(),
      end: new Date(2026, 10, 16).toISOString(),
      allDay: true,
    };
    const kinds = [0, 1, 2, 3].map(
      (i) => dinnerFor(new Date(fri.getFullYear(), fri.getMonth(), fri.getDate() + i), { ...base, events: [trip] }).kind,
    );
    expect(kinds).toEqual(["out", "out", "out", "unplanned"]);
  });

  it("is unplanned when nothing is on the meal plan", () => {
    expect(dinnerFor(day, { ...base, mealPlan: [] }).kind).toBe("unplanned");
  });
});

describe("focusFor", () => {
  it("leads with groceries on Saturday morning", () => {
    expect(focusFor(new Date(2026, 10, 14, 9, 30))).toBe("groceries");
  });
  it("leads with dinner in the late afternoon and evening, Saturdays included", () => {
    expect(focusFor(new Date(2026, 10, 11, 17, 0))).toBe("dinner");
    expect(focusFor(new Date(2026, 10, 14, 17, 0))).toBe("dinner");
  });
  it("leads with the day otherwise", () => {
    expect(focusFor(new Date(2026, 10, 11, 8, 0))).toBe("today");
    expect(focusFor(new Date(2026, 10, 11, 22, 0))).toBe("today");
  });
});

describe("householdState", () => {
  it("covers seven days starting today and counts unchecked groceries", () => {
    const now = new Date(2026, 10, 11, 17, 0);
    const s = householdState(now, base);
    expect(s.week).toHaveLength(7);
    expect(dateKey(s.week[0].day)).toBe("2026-11-11");
    expect(dateKey(s.week[6].day)).toBe("2026-11-17");
    expect(s.tonight.kind).toBe("cook");
    expect(s.groceriesLeft).toBe(1);
  });

  it("puts an event on the right day only", () => {
    const tomorrow = new Date(2026, 10, 12);
    const data = {
      ...base,
      events: [
        {
          id: "e",
          title: "Concert",
          start: at(19, 0, tomorrow),
          end: at(22, 0, tomorrow),
        },
      ],
    };
    const week = weekDinners(new Date(2026, 10, 11, 12, 0), data);
    expect(week[0].dinner.kind).toBe("cook");
    expect(week[1].dinner.kind).toBe("out");
  });
});
