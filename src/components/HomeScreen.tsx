"use client";

import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { dateKey, startOfDay, type DayDinner, type Dinner, type Focus } from "@/lib/household/state";
import type { CalendarEvent, GroceryItem, StoredData } from "@/lib/household/types";
import { useHousehold } from "@/lib/useHousehold";
import { GroceryChecklist, useGroceryTicks } from "./GroceryChecklist";
import { Card, dinnerTag, formatMinutes, Screen, Tag, time } from "./ui";

const ORDER: Record<Focus, Array<"dinner" | "groceries" | "today">> = {
  dinner: ["dinner", "today", "groceries"],
  groceries: ["groceries", "dinner", "today"],
  today: ["today", "dinner", "groceries"],
};

export function HomeScreen({ stored, canSignOut }: { stored: StoredData; canSignOut: boolean }) {
  const { shown, toggle, left } = useGroceryTicks(stored.groceries);
  const state = useHousehold(stored);
  if (!state) return <Screen />;
  const { now } = state;

  const sections = {
    dinner: (lead: boolean) => <DinnerCard key="dinner" dinner={state.tonight} now={now} lead={lead} />,
    groceries: (lead: boolean) => <GroceryCard key="groceries" items={shown} left={left} lead={lead} onToggle={toggle} />,
    today: (lead: boolean) => <AgendaCard key="today" events={state.agenda} now={now} lead={lead} />,
  };

  return (
    <Screen>
      <header className="flex items-end justify-between px-1 pt-2">
        <div>
          <p className="text-sm text-muted">{now.toLocaleDateString([], { weekday: "long" })}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {now.toLocaleDateString([], { month: "long", day: "numeric" })}
          </h1>
        </div>
        <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">Sample calendar</span>
      </header>

      {ORDER[state.focus].map((name, i) => sections[name](i === 0))}

      <WeekCard week={state.week} />

      {canSignOut && (
        <form action={signOut} className="flex justify-center">
          <button className="min-h-11 px-4 text-sm text-muted underline-offset-4 hover:underline">Sign out</button>
        </form>
      )}
    </Screen>
  );
}

function DinnerCard({ dinner, now, lead }: { dinner: Dinner; now: Date; lead: boolean }) {
  const title = lead ? "text-2xl font-semibold leading-tight tracking-tight" : "text-lg font-semibold leading-snug";
  const sub = `mt-1 text-sm ${lead ? "" : "text-muted"}`;

  if (dinner.kind === "cook") {
    const { recipe, startBy, squeezedBy } = dinner;
    const headStart = startBy < startOfDay(now);
    const dueNow = !headStart && now >= startBy && now.getHours() < 21;
    const when = headStart ? "Needs starting the day before" : dueNow ? "Time to start cooking" : `Start by ${time(startBy)}`;
    return (
      <Card lead={lead} label="Dinner tonight">
        <p className={title}>{recipe.title}</p>
        <p className={sub}>
          {formatMinutes(recipe.minutes)} · {when}
        </p>
        {squeezedBy && (
          <p className={sub}>
            {squeezedBy.title} runs until {time(squeezedBy.end)}, so cooking may start late.
          </p>
        )}
        {recipe.url && (
          <a href={recipe.url} target="_blank" rel="noreferrer" className={`${sub} inline-block font-medium underline`}>
            Open the recipe
          </a>
        )}
      </Card>
    );
  }
  if (dinner.kind === "out") {
    return (
      <Card lead={lead} label="Dinner tonight">
        <p className={title}>You&rsquo;re out: {dinner.event.title}</p>
        <p className={sub}>
          {time(dinner.event.start)}
          {dinner.event.location ? ` · ${dinner.event.location}` : ""}
        </p>
        {dinner.skipped && <p className={sub}>{dinner.skipped.title} needs a new night.</p>}
      </Card>
    );
  }
  if (dinner.kind === "hosting") {
    return (
      <Card lead={lead} label="Hosting tonight">
        <p className={title}>{dinner.recipe ? dinner.recipe.title : dinner.event.title}</p>
        <p className={sub}>
          {dinner.event.title} · {time(dinner.event.start)}
          {dinner.recipe ? ` · ${formatMinutes(dinner.recipe.minutes)} to cook` : " · nothing planned yet"}
        </p>
      </Card>
    );
  }
  return (
    <Card lead={lead} label="Dinner tonight">
      <p className={title}>Nothing planned</p>
      {dinner.squeezedBy && (
        <p className={sub}>
          {dinner.squeezedBy.title} runs until {time(dinner.squeezedBy.end)}.
        </p>
      )}
      <Link href="/meals" className={`${sub} inline-block font-medium underline`}>
        Pick a meal
      </Link>
    </Card>
  );
}

function AgendaCard({ events, now, lead }: { events: CalendarEvent[]; now: Date; lead: boolean }) {
  const muted = lead ? "" : "text-muted";
  return (
    <Card lead={lead} label="Today">
      {events.length === 0 ? (
        <p className={lead ? "text-2xl font-semibold tracking-tight" : "text-lg font-semibold"}>Nothing on the calendar</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {events.map((e) => {
            const past = new Date(e.end) <= now;
            return (
              <li key={e.id} className={`flex gap-3 ${past ? "opacity-50" : ""}`}>
                <span className={`w-16 shrink-0 text-sm tabular-nums ${muted}`}>{e.allDay ? "All day" : time(e.start)}</span>
                <span className="min-w-0">
                  <span className="block font-medium">{e.title}</span>
                  {e.location && <span className={`block text-sm ${muted}`}>{e.location}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function GroceryCard({
  items,
  left,
  lead,
  onToggle,
}: {
  items: GroceryItem[];
  left: number;
  lead: boolean;
  onToggle: (id: string, done: boolean) => void;
}) {
  const summary =
    items.length === 0
      ? "The list is empty"
      : left === 0
        ? "Everything is ticked off"
        : `${left} ${left === 1 ? "item" : "items"} to get`;
  const next = items.filter((i) => !i.done).slice(0, 4);

  if (lead) {
    return (
      <Card lead label="Grocery list">
        <p className="mb-4 text-2xl font-semibold tracking-tight">{summary}</p>
        <GroceryChecklist items={items} onToggle={onToggle} onAccent />
        <Link href="/groceries" className="mt-4 inline-block text-sm font-medium underline">
          Add or tidy items
        </Link>
      </Card>
    );
  }

  // Not the lead card: collapsed to a summary, but still opens to the full tickable list.
  return (
    <Card label="Grocery list">
      <details className="group">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-3">
            <span className="text-lg font-semibold">{summary}</span>
            {items.length > 0 && (
              <>
                <span className="text-sm text-muted group-open:hidden">Show</span>
                <span className="hidden text-sm text-muted group-open:inline">Hide</span>
              </>
            )}
          </span>
          {next.length > 0 && (
            <span className="mt-1 block text-sm text-muted group-open:hidden">
              {next.map((i) => i.name).join(", ")}
              {left > next.length ? ` and ${left - next.length} more` : ""}
            </span>
          )}
        </summary>
        <div className="mt-4">
          <GroceryChecklist items={items} onToggle={onToggle} />
        </div>
      </details>
    </Card>
  );
}

function WeekCard({ week }: { week: DayDinner[] }) {
  return (
    <Card label="Dinners this week">
      <ul className="flex flex-col divide-y divide-line">
        {week.map(({ day, dinner }, i) => (
          <li key={dateKey(day)} className="flex items-baseline gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="w-16 shrink-0 text-sm text-muted">
              {i === 0 ? "Today" : day.toLocaleDateString([], { weekday: "short", day: "numeric" })}
            </span>
            <span className={`min-w-0 flex-1 ${dinner.kind === "unplanned" ? "text-muted" : ""}`}>{weekText(dinner)}</span>
            {dinnerTag(dinner) && <Tag>{dinnerTag(dinner)}</Tag>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function weekText(d: Dinner): string {
  if (d.kind === "cook") return d.recipe.title;
  if (d.kind === "out") return d.event.title;
  if (d.kind === "hosting") return d.recipe?.title ?? d.event.title;
  return "Nothing planned";
}
