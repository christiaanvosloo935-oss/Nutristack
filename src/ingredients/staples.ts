import { normalizeIngredient } from "./normalize";

const EXACT_STAPLES = new Set([
  "salt",
  "pepper",
  "black pepper",
  "white pepper",
  "water",
  "oil",
  "olive oil",
  "vegetable oil",
  "sunflower oil",
  "cooking oil",
  "sugar",
  "flour",
  "plain flour",
  "butter",
]);

const STAPLE_LAST_WORDS = new Set(["salt", "oil", "water"]);

export function isStaple(name: string): boolean {
  const n = normalizeIngredient(name);
  if (!n) return false;
  if (EXACT_STAPLES.has(n)) return true;
  const words = n.split(" ");
  return STAPLE_LAST_WORDS.has(words[words.length - 1]);
}
