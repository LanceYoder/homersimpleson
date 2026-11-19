"use client";

import { useOptimistic, useTransition } from "react";
import { toggleGrocery } from "@/app/actions";
import type { GroceryItem } from "@/lib/household/types";

/**
 * Grocery items with a tick that shows straight away and saves in the
 * background. Returns the items as they currently look, and a toggle.
 */
export function useGroceryTicks(items: GroceryItem[]) {
  const [, startTransition] = useTransition();
  const [shown, tick] = useOptimistic(items, (current, change: { id: string; done: boolean }) =>
    current.map((i) => (i.id === change.id ? { ...i, done: change.done } : i)),
  );
  const toggle = (id: string, done: boolean) =>
    startTransition(async () => {
      tick({ id, done });
      await toggleGrocery(id, done);
    });
  return { shown, toggle, left: shown.filter((i) => !i.done).length };
}

/** The list grouped by aisle. `onAccent` draws it for the coloured lead card. */
export function GroceryChecklist({
  items,
  onToggle,
  onAccent = false,
}: {
  items: GroceryItem[];
  onToggle: (id: string, done: boolean) => void;
  onAccent?: boolean;
}) {
  const aisles = [...new Set(items.map((i) => i.aisle))];
  // The colour the box and tick are drawn in, against the card behind them.
  const box = onAccent
    ? "border-on-accent checked:bg-on-accent checked:before:border-accent focus-visible:outline-on-accent"
    : "border-muted checked:border-accent checked:bg-accent checked:before:border-card focus-visible:outline-accent";

  return (
    <div className="flex flex-col gap-4">
      {aisles.map((aisle) => (
        <div key={aisle}>
          <h3 className={`text-xs font-medium uppercase tracking-wider ${onAccent ? "" : "text-muted"}`}>{aisle}</h3>
          <ul className="mt-1">
            {items
              .filter((i) => i.aisle === aisle)
              .map((i) => (
                <li key={i.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={i.done}
                      onChange={(e) => onToggle(i.id, e.target.checked)}
                      className={`grid size-5 shrink-0 appearance-none place-content-center rounded border-2 bg-transparent checked:before:block checked:before:h-2.5 checked:before:w-1.5 checked:before:-translate-y-px checked:before:rotate-45 checked:before:border-r-2 checked:before:border-b-2 checked:before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 ${box}`}
                    />
                    <span className={i.done ? "line-through" : ""}>{i.name}</span>
                  </label>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
