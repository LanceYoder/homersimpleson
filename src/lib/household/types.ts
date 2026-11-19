export type CalendarEvent = {
  id: string;
  title: string;
  /** ISO timestamps. */
  start: string;
  end: string;
  location?: string;
  allDay?: boolean;
};

export type Effort = "quick" | "standard" | "involved";

export type Recipe = {
  id: string;
  title: string;
  minutes: number;
  effort: Effort;
  url?: string;
  /** Things to buy for it, by name. */
  ingredients: string[];
};

export type PlannedMeal = {
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  recipeId: string;
};

export type GroceryItem = {
  id: string;
  name: string;
  aisle: string;
  done: boolean;
};

/** What the app keeps in its own database. */
export type StoredData = Pick<HouseholdData, "recipes" | "mealPlan" | "groceries">;

export type HouseholdData = {
  events: CalendarEvent[];
  recipes: Recipe[];
  mealPlan: PlannedMeal[];
  groceries: GroceryItem[];
};
