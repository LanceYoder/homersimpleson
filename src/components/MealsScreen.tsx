"use client";

import { useRef, useTransition } from "react";
import { addRecipe, deleteRecipe, setMeal } from "@/app/actions";
import { dateKey, type DayDinner } from "@/lib/household/state";
import type { Recipe, StoredData } from "@/lib/household/types";
import { useHousehold } from "@/lib/useHousehold";
import { button, Card, dinnerTag, field, formatMinutes, Screen, Tag } from "./ui";

export function MealsScreen({ stored }: { stored: StoredData }) {
  const state = useHousehold(stored);

  return (
    <Screen>
      <header className="px-1 pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">Meals</h1>
        <p className="text-sm text-muted">This week&rsquo;s dinners and your recipes</p>
      </header>

      <Card label="This week">
        {stored.recipes.length === 0 ? (
          <p className="text-sm text-muted">Add a recipe below to start planning.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {(state?.week ?? []).map((d, i) => (
              <NightRow key={dateKey(d.day)} night={d} today={i === 0} stored={stored} />
            ))}
          </ul>
        )}
      </Card>

      <Card label="Recipes">
        {stored.recipes.length === 0 ? (
          <p className="text-sm text-muted">No recipes yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {stored.recipes.map((r) => (
              <RecipeRow key={r.id} recipe={r} />
            ))}
          </ul>
        )}
      </Card>

      <AddRecipe />
    </Screen>
  );
}

function NightRow({ night, today, stored }: { night: DayDinner; today: boolean; stored: StoredData }) {
  const { day, dinner } = night;
  const key = dateKey(day);
  const [pending, startTransition] = useTransition();
  const planned = stored.mealPlan.find((m) => m.date === key)?.recipeId ?? "";
  const label = today ? "Today" : day.toLocaleDateString([], { weekday: "long", day: "numeric" });
  const away = dinner.kind === "out" || dinner.kind === "hosting" ? dinner.event.title : null;

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{label}</span>
        {dinnerTag(dinner) && <Tag>{dinnerTag(dinner)}</Tag>}
      </div>
      {away && <p className="text-sm text-muted">{away}</p>}
      {dinner.kind === "cook" && dinner.squeezedBy && (
        <p className="text-sm text-muted">{dinner.squeezedBy.title} runs into the evening</p>
      )}
      <select
        aria-label={`Dinner for ${label}`}
        value={planned}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value || null;
          startTransition(() => setMeal(key, id));
        }}
        className={`${field} mt-2`}
      >
        <option value="">Nothing planned</option>
        {stored.recipes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title} ({formatMinutes(r.minutes)})
          </option>
        ))}
      </select>
    </li>
  );
}

function RecipeRow({ recipe }: { recipe: Recipe }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="font-medium">{recipe.title}</p>
        <p className="text-sm text-muted">
          {formatMinutes(recipe.minutes)} · {recipe.effort}
          {recipe.ingredients.length > 0 ? ` · ${recipe.ingredients.length} to buy` : ""}
        </p>
        {recipe.url && (
          <a href={recipe.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-accent underline">
            Open the recipe
          </a>
        )}
      </div>
      <button
        onClick={() => {
          if (window.confirm(`Remove "${recipe.title}"? It also comes off any night it is planned for.`)) {
            startTransition(() => deleteRecipe(recipe.id));
          }
        }}
        disabled={pending}
        className="min-h-11 shrink-0 px-2 text-sm text-muted underline"
      >
        Remove
      </button>
    </li>
  );
}

function AddRecipe() {
  const form = useRef<HTMLFormElement>(null);
  return (
    <Card label="Add a recipe">
      <form
        ref={form}
        action={async (data) => {
          await addRecipe(data);
          form.current?.reset();
        }}
        className="flex flex-col gap-2"
      >
        <input name="title" required maxLength={120} placeholder="Name" aria-label="Name" autoComplete="off" className={field} />
        <div className="flex gap-2">
          <input
            name="minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            required
            placeholder="Minutes"
            aria-label="Minutes from start to table"
            className={field}
          />
          <select name="effort" aria-label="Effort" defaultValue="standard" className={field}>
            <option value="quick">Quick</option>
            <option value="standard">Standard</option>
            <option value="involved">Involved</option>
          </select>
        </div>
        <input name="url" type="url" maxLength={500} placeholder="Link (optional)" aria-label="Link" className={field} />
        <textarea
          name="ingredients"
          rows={4}
          placeholder={"Things to buy, one per line"}
          aria-label="Things to buy, one per line"
          className={`${field} py-2`}
        />
        <button className={button}>Save recipe</button>
      </form>
    </Card>
  );
}
