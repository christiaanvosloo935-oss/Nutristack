import { describe, expect, test } from "vitest";
import { fetchAllMeals, parseMeal } from "../src/library/mealdb";

const rawMeal = {
  idMeal: "52772",
  strMeal: "Teriyaki Chicken",
  strCategory: "Chicken",
  strArea: "Japanese",
  strMealThumb: "https://www.themealdb.com/images/media/meals/x.jpg",
  strInstructions: "Cook it.",
  strSource: "",
  strIngredient1: "Chicken",
  strMeasure1: "200g",
  strIngredient2: "",
  strMeasure2: " ",
  strIngredient3: null,
  strMeasure3: null,
  strIngredient4: " Salt ",
  strMeasure4: null,
};

describe("parseMeal", () => {
  test("skips blank and null ingredient slots and trims names", () => {
    const r = parseMeal(rawMeal);
    expect(r.ingredients).toEqual([
      { name: "Chicken", measure: "200g" },
      { name: "Salt", measure: "" },
    ]);
  });

  test("maps the other fields and turns an empty source into undefined", () => {
    const r = parseMeal(rawMeal);
    expect(r).toMatchObject({
      id: "52772",
      name: "Teriyaki Chicken",
      category: "Chicken",
      area: "Japanese",
      thumb: "https://www.themealdb.com/images/media/meals/x.jpg",
      instructions: "Cook it.",
    });
    expect(r.source).toBeUndefined();
  });

  test("keeps a non-empty source", () => {
    expect(parseMeal({ ...rawMeal, strSource: "https://example.com/r" }).source).toBe("https://example.com/r");
  });
});

describe("fetchAllMeals", () => {
  const respond = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

  test("requests a..z, tolerates meals:null and dedupes by id", async () => {
    const urls: string[] = [];
    const fetchFn = (async (url: string) => {
      urls.push(url);
      if (url.endsWith("f=a") || url.endsWith("f=b")) return respond({ meals: [rawMeal] });
      return respond({ meals: null });
    }) as unknown as typeof fetch;
    const recipes = await fetchAllMeals(fetchFn);
    expect(urls).toHaveLength(26);
    expect(urls[0]).toBe("https://www.themealdb.com/api/json/v1/1/search.php?f=a");
    expect(urls[25]).toBe("https://www.themealdb.com/api/json/v1/1/search.php?f=z");
    expect(recipes).toHaveLength(1);
  });

  test("rejects if any letter fails, returning no partial result", async () => {
    const fetchFn = (async (url: string) => respond({ meals: null }, !url.endsWith("f=m"))) as unknown as typeof fetch;
    await expect(fetchAllMeals(fetchFn)).rejects.toThrow();
  });
});
