import { describe, expect, test } from "vitest";
import { matchOne, matchRecipes } from "../src/matcher";
import { bigStew, chickenRice, omelette, recipe, saltWater, tomatoPasta } from "./fixtures/recipes";

const all = [omelette, tomatoPasta, chickenRice, saltWater, bigStew];

describe("matchRecipes", () => {
  test("a fully covered recipe has nothing missing and lists staples separately", () => {
    const [m] = matchRecipes(["eggs", "cheese"], all);
    expect(m.recipe.id).toBe("1");
    expect(m.missing).toEqual([]);
    expect(m.have).toEqual(["Eggs", "Cheese"]);
    expect(m.staples).toEqual(["Butter", "Salt"]);
  });

  test("includes recipes missing exactly 2 and excludes missing 3", () => {
    const two = matchRecipes(["chicken", "rice", "onion", "garlic"], [chickenRice]);
    expect(two).toHaveLength(1);
    expect(two[0].missing).toEqual(["Soy Sauce", "Ginger"]);
    const three = matchRecipes(["chicken", "rice", "onion"], [chickenRice]);
    expect(three).toEqual([]);
  });

  test("staples alone never produce a match", () => {
    expect(matchRecipes(["salt", "water"], [saltWater])).toEqual([]);
  });

  test("case, whitespace and plural differences behave identically", () => {
    const a = matchRecipes(["Eggs ", "CHEESE"], all).map((m) => m.recipe.id);
    const b = matchRecipes(["egg", "cheese"], all).map((m) => m.recipe.id);
    expect(a).toEqual(b);
    expect(a).toContain("1");
  });

  test("a general fridge item matches a more specific recipe ingredient", () => {
    const [m] = matchRecipes(["chicken", "rice", "onion", "garlic", "soy sauce", "ginger"], [chickenRice]);
    expect(m.have).toContain("Chicken Breast");
  });

  test("a specific fridge item matches a more general recipe ingredient", () => {
    expect(matchRecipes(["chicken breast"], [recipe("9", "Plain Chicken", ["Chicken"])])).toHaveLength(1);
    expect(matchRecipes(["cheddar cheese"], [recipe("8", "Toastie", ["Bread", "Cheese"])])).toHaveLength(1);
  });

  test.each([
    ["rice", "Rice Vinegar"],
    ["milk", "Coconut Milk"],
    ["chicken", "Chicken Stock"],
    ["tomato", "Tomato Paste"],
    ["chicken stock", "Chicken"],
  ])("fridge %j does not match the different product %j", (fridgeItem, ingredient) => {
    expect(matchRecipes([fridgeItem], [recipe("7", "X", [ingredient])])).toEqual([]);
  });

  test("the same specific product still matches itself", () => {
    expect(matchRecipes(["chicken stock"], [recipe("6", "Soup", ["Chicken Stock"])])).toHaveLength(1);
  });

  test("empty fridge returns no matches", () => {
    expect(matchRecipes([], all)).toEqual([]);
  });

  test("sorts by fewest missing, then most ingredients had, then name", () => {
    const apple = recipe("a", "Apple Dish", ["Egg", "Milk"]);
    const banana = recipe("b", "Banana Dish", ["Egg", "Milk"]);
    const ids = matchRecipes(["egg", "milk", "cheese", "pasta", "tomato", "garlic"], [banana, omelette, tomatoPasta, apple]).map((m) => m.recipe.id);
    expect(ids).toEqual(["2", "a", "b", "1"]);
  });
});

describe("matchOne", () => {
  test("classifies any recipe without applying the missing cutoff", () => {
    const m = matchOne(["beef"], bigStew);
    expect(m.have).toEqual(["Beef"]);
    expect(m.missing).toEqual(["Carrots", "Potatoes", "Leek", "Celery", "Thyme"]);
  });
});
