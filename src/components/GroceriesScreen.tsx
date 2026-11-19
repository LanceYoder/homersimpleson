"use client";

import { useRef, useState, useTransition } from "react";
import { addGrocery, addIngredientsFor, clearTickedGroceries } from "@/app/actions";
import { AISLES } from "@/lib/household/aisles";
import { dateKey } from "@/lib/household/state";
import type { StoredData } from "@/lib/household/types";
import { useHousehold } from "@/lib/useHousehold";
import { GroceryChecklist, useGroceryTicks } from "./GroceryChecklist";
import { button, Card, field, quietButton, Screen } from "./ui";

export function GroceriesScreen({ stored }: { stored: StoredData }) {
  const { shown, toggle, left } = useGroceryTicks(stored.groceries);
  const state = useHousehold(stored);
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  // Nights this week when dinner is cooked at home: the meals worth shopping for.
  const cookNights = (state?.week ?? [])
    .filter(({ dinner }) => dinner.kind === "cook" || (dinner.kind === "hosting" && dinner.recipe))
    .map(({ day }) => dateKey(day));
  const ticked = shown.length - left;

  const addFromPlan = () =>
    startTransition(async () => {
      const added = await addIngredientsFor(cookNights);
      setNote(added === 0 ? "Nothing new to add." : `Added ${added} ${added === 1 ? "item" : "items"}.`);
    });

  return (
    <Screen>
      <header className="px-1 pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">Groceries</h1>
        <p className="text-sm text-muted">
          {shown.length === 0 ? "The list is empty" : left === 0 ? "Everything is ticked off" : `${left} to get`}
        </p>
      </header>

      <Card label="Add an item">
        <form
          ref={form}
          action={async (data) => {
            await addGrocery(data);
            form.current?.reset();
          }}
          className="flex flex-col gap-2"
        >
          <input name="name" required maxLength={80} placeholder="Milk" aria-label="Item" autoComplete="off" className={field} />
          <div className="flex gap-2">
            <select name="aisle" aria-label="Aisle" defaultValue="" className={field}>
              <option value="">Aisle: guess for me</option>
              {AISLES.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <button className={`${button} shrink-0`}>Add</button>
          </div>
        </form>
      </Card>

      {state && (
      <Card label="From the meal plan">
        <p className="text-sm text-muted">
          {cookNights.length === 0
            ? "No meals are planned for nights you're home this week."
            : `Adds what's needed for the ${cookNights.length} ${cookNights.length === 1 ? "night" : "nights"} you're cooking this week, skipping nights out and anything already listed.`}
        </p>
        <div className="mt-3 flex flex-col items-start gap-2">
          <button onClick={addFromPlan} disabled={pending || cookNights.length === 0} className={quietButton}>
            Add this week&rsquo;s ingredients
          </button>
          {note && (
            <span role="status" className="text-sm text-muted">
              {note}
            </span>
          )}
        </div>
      </Card>
      )}

      {shown.length > 0 && (
        <Card label="The list">
          <GroceryChecklist items={shown} onToggle={toggle} />
          {ticked > 0 && (
            <button
              onClick={() => startTransition(() => clearTickedGroceries())}
              disabled={pending}
              className={`${quietButton} mt-4`}
            >
              Remove {ticked} ticked {ticked === 1 ? "item" : "items"}
            </button>
          )}
        </Card>
      )}
    </Screen>
  );
}
