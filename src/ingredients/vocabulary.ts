import type { Recipe } from "../types";
import { normalizeIngredient } from "./normalize";
import { isStaple } from "./staples";

export const QUICK_ADD = [
  "eggs",
  "rice",
  "pasta",
  "onion",
  "tomato",
  "cheese",
  "potato",
  "chicken",
  "garlic",
  "milk",
  "bread",
  "carrot",
];

export const QUICK_ADD_EMOJI: Record<string, string> = {
  eggs: "🥚",
  rice: "🍚",
  pasta: "🍝",
  onion: "🧅",
  tomato: "🍅",
  cheese: "🧀",
  potato: "🥔",
  chicken: "🍗",
  garlic: "🧄",
  milk: "🥛",
  bread: "🍞",
  carrot: "🥕",
};

export function buildVocabulary(recipes: Recipe[]): string[] {
  const names = new Set<string>();
  for (const recipe of recipes) {
    for (const { name } of recipe.ingredients) {
      if (isStaple(name)) continue;
      const normalized = normalizeIngredient(name);
      if (normalized) names.add(normalized);
    }
  }
  return [...names].sort();
}

export function suggest(vocab: string[], query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const prefix = vocab.filter((v) => v.startsWith(q));
  const substring = vocab.filter((v) => !v.startsWith(q) && v.includes(q));
  return [...prefix, ...substring].slice(0, limit);
}
