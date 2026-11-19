export const AISLES = ["Produce", "Meat and fish", "Fridge", "Bakery", "Pantry", "Frozen", "Household", "Other"] as const;

const KEYWORDS: Array<[string, RegExp]> = [
  // First, so "beef stock" and "canned tomatoes" are not filed by their main ingredient.
  ["Pantry", /\b(stock|broth|canned|tinned|dried)\b/i],
  ["Produce", /\b(lemons?|limes?|kale|garlic|onions?|shallots?|tomato(es)?|potato(es)?|carrots?|celery|spinach|lettuce|greens|herbs?|parsley|cilantro|basil|ginger|peppers?|mushrooms?|apples?|bananas?|berries|avocados?|broccoli|zucchini|cucumbers?|scallions?)\b/i],
  ["Meat and fish", /\b(chicken|beef|pork|lamb|ribs|steak|sausages?|bacon|turkey|salmon|cod|shrimp|fish|mince)\b/i],
  ["Fridge", /\b(milk|butter|cream|yogurt|yoghurt|cheese|parmesan|feta|eggs?|miso|tofu)\b/i],
  ["Bakery", /\b(bread|baguette|rolls?|tortillas?|pitas?)\b/i],
  ["Frozen", /\b(frozen|ice cream)\b/i],
  ["Household", /\b(soap|detergent|paper towels?|toilet paper|foil|bin bags?|trash bags?|sponges?)\b/i],
  ["Pantry", /\b(rice|pasta|polenta|flour|sugar|salt|oil|vinegar|beans|lentils|olives|stock|broth|spices?|cumin|paprika|chili|noodles|cans?|tins?|soy sauce|honey|oats|nuts)\b/i],
];

/** A best guess at where an item is in the shop, from its name. */
export function guessAisle(name: string): string {
  return KEYWORDS.find(([, re]) => re.test(name))?.[0] ?? "Other";
}
