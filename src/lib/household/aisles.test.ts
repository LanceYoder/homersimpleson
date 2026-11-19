import { expect, it } from "vitest";
import { guessAisle } from "./aisles";

it("guesses the aisle from an item's name", () => {
  expect(guessAisle("Oat milk")).toBe("Fridge");
  expect(guessAisle("Chicken thighs")).toBe("Meat and fish");
  expect(guessAisle("Beef stock")).toBe("Pantry");
  expect(guessAisle("Canned tomatoes")).toBe("Pantry");
  expect(guessAisle("Lemons")).toBe("Produce");
  expect(guessAisle("Batteries")).toBe("Other");
});
