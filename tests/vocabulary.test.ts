import { describe, expect, test } from "vitest";
import { QUICK_ADD, QUICK_ADD_EMOJI, buildVocabulary, suggest } from "../src/ingredients/vocabulary";
import { recipe } from "./fixtures/recipes";

describe("buildVocabulary", () => {
  const vocab = buildVocabulary([
    recipe("1", "A", ["Eggs", "Salt", "Chicken"]),
    recipe("2", "B", ["egg", "Chickpeas", "Olive Oil"]),
  ]);
  test("dedupes by normalised name", () => {
    expect(vocab.filter((v) => v === "egg")).toHaveLength(1);
  });
  test("excludes staples", () => {
    expect(vocab).not.toContain("salt");
    expect(vocab).not.toContain("olive oil");
  });
  test("is sorted", () => {
    expect(vocab).toEqual([...vocab].sort());
  });
});

describe("suggest", () => {
  const vocab = ["chicken", "chickpea", "stir-fried chili", "rice"];
  test("prefix matches come before substring matches", () => {
    expect(suggest(vocab, "chi")).toEqual(["chicken", "chickpea", "stir-fried chili"]);
  });
  test("respects the limit", () => {
    expect(suggest(vocab, "chi", 2)).toEqual(["chicken", "chickpea"]);
  });
  test("returns nothing for empty or whitespace queries", () => {
    expect(suggest(vocab, "")).toEqual([]);
    expect(suggest(vocab, "   ")).toEqual([]);
  });
});

test("QUICK_ADD lists common student foods", () => {
  expect(QUICK_ADD).toEqual(["eggs", "rice", "pasta", "onion", "tomato", "cheese", "potato", "chicken", "garlic", "milk", "bread", "carrot"]);
});

test("every quick-add food has an emoji", () => {
  for (const food of QUICK_ADD) expect(QUICK_ADD_EMOJI[food], food).toMatch(/\p{Extended_Pictographic}/u);
});
