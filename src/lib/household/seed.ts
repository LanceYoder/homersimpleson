import type { Db } from "../db";
import { guessAisle } from "./aisles";
import { addDays, dateKey } from "./state";

/** Sample recipes, meal plan and grocery list for the stand-in database only. */
const RECIPES = [
  { title: "Sheet-pan chicken with lemon and olives", minutes: 40, effort: "standard", ingredients: ["Chicken thighs", "Lemons", "Green olives"], night: 0 },
  { title: "Garlicky tomato pasta", minutes: 20, effort: "quick", ingredients: ["Pasta", "Canned tomatoes", "Garlic"], night: 1 },
  { title: "Miso salmon with rice and greens", minutes: 30, effort: "standard", ingredients: ["Salmon fillets", "White miso", "Kale", "Rice"], night: 3 },
  { title: "Braised short ribs with polenta", minutes: 180, effort: "involved", ingredients: ["Short ribs", "Polenta", "Carrots", "Beef stock"], night: 4 },
  { title: "Black bean chili", minutes: 45, effort: "standard", ingredients: ["Black beans", "Onions", "Cumin"], night: 6 },
];

export async function seed(db: Db) {
  const [{ count }] = await db.query<{ count: number }>("select count(*)::int as count from recipes");
  if (count > 0) return;

  for (const r of RECIPES) {
    const [{ id }] = await db.query<{ id: string }>(
      "insert into recipes (title, minutes, effort, ingredients) values ($1, $2, $3, $4::text::jsonb) returning id",
      [r.title, r.minutes, r.effort, JSON.stringify(r.ingredients)],
    );
    // This computer's date, not the database's (which runs on UTC).
    const night = dateKey(addDays(new Date(), r.night));
    await db.query("insert into planned_meals (date, recipe_id) values ($1::date, $2)", [night, id]);
  }
  for (const name of ["Lemons", "Kale", "Chicken thighs", "Salmon fillets", "Green olives", "White miso"]) {
    await db.query("insert into grocery_items (name, aisle) values ($1, $2)", [name, guessAisle(name)]);
  }
}
