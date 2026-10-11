import type { Match, Recipe } from "./types";
import { normalizeIngredient } from "./ingredients/normalize";
import { isStaple } from "./ingredients/staples";

const MAX_MISSING = 2;

function words(name: string): string[] {
  return normalizeIngredient(name).split(" ").filter(Boolean);
}

/** A fridge item matches a recipe ingredient when all its words appear in the ingredient's words. */
function fridgeItemMatches(fridgeWords: string[], ingredientWords: string[]): boolean {
  return fridgeWords.length > 0 && fridgeWords.every((w) => ingredientWords.includes(w));
}

function classify(fridgeItems: string[][], recipe: Recipe): Match {
  const have: string[] = [];
  const missing: string[] = [];
  const staples: string[] = [];
  for (const { name } of recipe.ingredients) {
    if (isStaple(name)) {
      staples.push(name);
    } else if (fridgeItems.some((f) => fridgeItemMatches(f, words(name)))) {
      have.push(name);
    } else {
      missing.push(name);
    }
  }
  return { recipe, have, missing, staples };
}

function fridgeWords(fridge: string[]): string[][] {
  return fridge.map(words).filter((w) => w.length > 0);
}

/** Classify one recipe against the fridge, with no missing-ingredient cutoff. */
export function matchOne(fridge: string[], recipe: Recipe): Match {
  return classify(fridgeWords(fridge), recipe);
}

export function matchRecipes(fridge: string[], recipes: Recipe[]): Match[] {
  const items = fridgeWords(fridge);
  if (items.length === 0) return [];
  return recipes
    .map((recipe) => classify(items, recipe))
    .filter((m) => m.have.length >= 1 && m.missing.length <= MAX_MISSING)
    .sort(
      (a, b) =>
        a.missing.length - b.missing.length ||
        b.have.length - a.have.length ||
        a.recipe.name.localeCompare(b.recipe.name),
    );
}
