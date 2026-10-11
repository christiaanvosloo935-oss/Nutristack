import type { Recipe } from "../types";

const BASE_URL = "https://www.themealdb.com/api/json/v1/1/search.php";
const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

type RawMeal = Record<string, string | null | undefined>;

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function parseMeal(raw: RawMeal): Recipe {
  const ingredients: Recipe["ingredients"] = [];
  for (let i = 1; i <= 20; i++) {
    const name = text(raw[`strIngredient${i}`]);
    if (!name) continue;
    ingredients.push({ name, measure: text(raw[`strMeasure${i}`]) });
  }
  return {
    id: text(raw.idMeal),
    name: text(raw.strMeal),
    category: text(raw.strCategory),
    area: text(raw.strArea),
    thumb: text(raw.strMealThumb),
    ingredients,
    instructions: text(raw.strInstructions),
    source: text(raw.strSource) || undefined,
  };
}

async function fetchLetter(letter: string, fetchFn: typeof fetch): Promise<RawMeal[]> {
  const response = await fetchFn(`${BASE_URL}?f=${letter}`);
  if (!response.ok) throw new Error(`TheMealDB request failed for letter ${letter}`);
  const body = (await response.json()) as { meals: RawMeal[] | null };
  return body.meals ?? [];
}

export async function fetchAllMeals(fetchFn: typeof fetch = fetch): Promise<Recipe[]> {
  const batches = await Promise.all(LETTERS.map((letter) => fetchLetter(letter, fetchFn)));
  const byId = new Map<string, Recipe>();
  for (const raw of batches.flat()) {
    const recipe = parseMeal(raw);
    if (recipe.id) byId.set(recipe.id, recipe);
  }
  return [...byId.values()];
}
