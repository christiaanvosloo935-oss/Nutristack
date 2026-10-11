import type { Recipe } from "../../src/types";

export function recipe(id: string, name: string, ingredientNames: string[], category = "Misc"): Recipe {
  return {
    id,
    name,
    category,
    area: "Test",
    thumb: `https://img.test/${id}.jpg`,
    ingredients: ingredientNames.map((n) => ({ name: n, measure: "1" })),
    instructions: "Step one.\r\n\r\nStep two.",
  };
}

export const omelette = recipe("1", "Cheese Omelette", ["Eggs", "Cheese", "Butter", "Salt"], "Breakfast");
export const tomatoPasta = recipe("2", "Tomato Pasta", ["Pasta", "Tomatoes", "Garlic", "Olive Oil", "Salt"], "Pasta");
export const chickenRice = recipe("3", "Chicken Rice", ["Chicken Breast", "Rice", "Onion", "Garlic", "Soy Sauce", "Ginger"], "Chicken");
export const saltWater = recipe("4", "Brine", ["Salt", "Water", "Vinegar", "Peppercorns", "Dill"], "Misc");
export const bigStew = recipe("5", "Big Stew", ["Beef", "Carrots", "Potatoes", "Leek", "Celery", "Thyme"], "Beef");
