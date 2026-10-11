import { describe, expect, test } from "vitest";
import { normalizeIngredient } from "../src/ingredients/normalize";
import { isStaple } from "../src/ingredients/staples";

describe("normalizeIngredient", () => {
  test.each([
    ["  Eggs ", "egg"],
    ["Tomatoes", "tomato"],
    ["Cherries", "cherry"],
    ["Chickpeas", "chickpea"],
    ["Hummus", "hummus"],
    ["Asparagus", "asparagus"],
    ["Scallions", "spring onion"],
    ["Spring Onions", "spring onion"],
    ["Minced   Beef", "minced beef"],
    ["", ""],
  ])("%j -> %j", (raw, expected) => {
    expect(normalizeIngredient(raw)).toBe(expected);
  });
});

describe("isStaple", () => {
  test.each(["Salt", "Sea Salt", "Olive Oil", "Sesame Oil", "Water", "Boiling Water", "Black Pepper", "Sugar", "Plain Flour", "Butter"])(
    "%s is a staple",
    (n) => expect(isStaple(n)).toBe(true),
  );
  test.each(["Peanut Butter", "Chicken", "Tomato"])("%s is not a staple", (n) => expect(isStaple(n)).toBe(false));
});
