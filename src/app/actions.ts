"use server";

import { refresh } from "next/cache";
import { requireSignIn } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AISLES, guessAisle } from "@/lib/household/aisles";

// Every action checks the sign-in itself: these are reachable by anyone who
// can send a request, whatever the pages show.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const EFFORTS = ["quick", "standard", "involved"];

function need(ok: boolean, what: string): asserts ok {
  if (!ok) throw new Error(`Invalid ${what}`);
}

export async function toggleGrocery(id: string, done: boolean) {
  await requireSignIn();
  need(UUID.test(id), "item");
  await (await db()).query("update grocery_items set done = $2 where id = $1", [id, Boolean(done)]);
  refresh();
}

export async function addGrocery(formData: FormData) {
  await requireSignIn();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return;
  const picked = String(formData.get("aisle") ?? "");
  const aisle = (AISLES as readonly string[]).includes(picked) ? picked : guessAisle(name);
  await (await db()).query("insert into grocery_items (name, aisle) values ($1, $2)", [name, aisle]);
  refresh();
}

export async function clearTickedGroceries() {
  await requireSignIn();
  await (await db()).query("delete from grocery_items where done");
  refresh();
}

/** Puts a recipe on a night, or clears the night when recipeId is null. */
export async function setMeal(date: string, recipeId: string | null) {
  await requireSignIn();
  need(DAY.test(date), "date");
  const sql = await db();
  if (recipeId === null) {
    await sql.query("delete from planned_meals where date = $1::date", [date]);
  } else {
    need(UUID.test(recipeId), "recipe");
    await sql.query(
      `insert into planned_meals (date, recipe_id) values ($1::date, $2)
       on conflict (date) do update set recipe_id = excluded.recipe_id`,
      [date, recipeId],
    );
  }
  refresh();
}

export async function addRecipe(formData: FormData) {
  await requireSignIn();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const minutes = Number(formData.get("minutes"));
  const effort = String(formData.get("effort") ?? "");
  const url = String(formData.get("url") ?? "").trim().slice(0, 500);
  const ingredients = String(formData.get("ingredients") ?? "")
    .split("\n")
    .map((l) => l.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 50);
  need(title.length > 0, "title");
  need(Number.isInteger(minutes) && minutes > 0 && minutes <= 24 * 60, "time");
  need(EFFORTS.includes(effort), "effort");
  need(url === "" || /^https?:\/\//i.test(url), "link");
  await (await db()).query(
    "insert into recipes (title, minutes, effort, url, ingredients) values ($1, $2, $3, $4, $5::text::jsonb)",
    [title, minutes, effort, url || null, JSON.stringify(ingredients)],
  );
  refresh();
}

export async function deleteRecipe(id: string) {
  await requireSignIn();
  need(UUID.test(id), "recipe");
  await (await db()).query("delete from recipes where id = $1", [id]);
  refresh();
}

/**
 * Adds the ingredients for the meals planned on the given nights to the
 * grocery list, skipping anything already on it, ticked or not. Returns how many
 * items were added.
 */
export async function addIngredientsFor(dates: string[]): Promise<number> {
  await requireSignIn();
  need(Array.isArray(dates) && dates.length <= 14 && dates.every((d) => DAY.test(d)), "dates");
  if (dates.length === 0) return 0;
  const sql = await db();
  const rows = await sql.query<{ ingredients: string[] }>(
    `select r.ingredients from planned_meals p join recipes r on r.id = p.recipe_id
     where p.date = any($1::date[])`,
    [dates],
  );
  const listed = await sql.query<{ name: string }>("select name from grocery_items");
  const have = new Set(listed.map((g) => g.name.trim().toLowerCase()));
  let added = 0;
  for (const name of rows.flatMap((r) => r.ingredients)) {
    const key = name.trim().toLowerCase();
    if (!key || have.has(key)) continue;
    have.add(key);
    await sql.query("insert into grocery_items (name, aisle) values ($1, $2)", [name.trim(), guessAisle(name)]);
    added++;
  }
  refresh();
  return added;
}
