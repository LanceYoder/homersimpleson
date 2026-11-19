import { connection } from "next/server";
import { requireSignIn } from "../auth/session";
import { db } from "../db";
import type { GroceryItem, PlannedMeal, Recipe, StoredData } from "./types";

/** Everything the app keeps itself, read fresh for each request. */
export async function loadStored(): Promise<StoredData> {
  await connection();
  await requireSignIn();
  const sql = await db();
  const [recipes, mealPlan, groceries] = await Promise.all([
    sql.query<Recipe>("select id, title, minutes, effort, url, ingredients from recipes order by lower(title)"),
    sql.query<PlannedMeal>(
      `select to_char(date, 'YYYY-MM-DD') as date, recipe_id as "recipeId"
       from planned_meals where date >= current_date - 2 order by date`,
    ),
    sql.query<GroceryItem>("select id, name, aisle, done from grocery_items order by created_at, name"),
  ]);
  return {
    recipes: recipes.map((r) => ({ ...r, url: r.url ?? undefined })),
    mealPlan,
    groceries,
  };
}
