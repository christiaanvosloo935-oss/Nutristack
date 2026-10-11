import { AiQuotaError, AiUnavailableError } from "../../shared/aiRecipes";
import type { AiRecipe } from "../types";

const MAX_ITEMS = 15;
const MAX_ITEM_LENGTH = 40;

/** Keep the request inside the function's limits instead of failing with a confusing error. */
function prepare(ingredients: string[]): string[] {
  return ingredients
    .map((i) => i.trim().slice(0, MAX_ITEM_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
}

export async function fetchAiRecipes(ingredients: string[], fetchFn: typeof fetch = fetch): Promise<AiRecipe[]> {
  let response: Response;
  try {
    response = await fetchFn("/api/ai-recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ingredients: prepare(ingredients) }),
    });
  } catch {
    throw new AiUnavailableError();
  }
  if (response.status === 429) throw new AiQuotaError();
  if (!response.ok) throw new AiUnavailableError();
  try {
    const body = (await response.json()) as { recipes: AiRecipe[] };
    return body.recipes;
  } catch {
    throw new AiUnavailableError();
  }
}
