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

export function matchRecipes(fridge: string[], recipes: Recipe[]): Match[] {
  const fridgeItems = fridge.map(words).filter((w) => w.length > 0);
  if (fridgeItems.length === 0) return [];

  const matches: Match[] = [];
  for (const recipe of recipes) {
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
    if (have.length >= 1 && missing.length <= MAX_MISSING) {
      matches.push({ recipe, have, missing, staples });
    }
  }

  return matches.sort(
    (a, b) =>
      a.missing.length - b.missing.length ||
      b.have.length - a.have.length ||
      a.recipe.name.localeCompare(b.recipe.name),
  );
}
