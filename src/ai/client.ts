import { AiQuotaError, AiUnavailableError } from "../../shared/aiRecipes";
import type { AiRecipe } from "../types";

export async function fetchAiRecipes(ingredients: string[], fetchFn: typeof fetch = fetch): Promise<AiRecipe[]> {
  let response: Response;
  try {
    response = await fetchFn("/api/ai-recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ingredients }),
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
