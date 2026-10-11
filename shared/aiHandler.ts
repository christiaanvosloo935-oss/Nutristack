import { AiQuotaError, DEFAULT_MODEL, callGemini, validateRequest } from "./aiRecipes";

export interface AiEnv {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

/** POST /api/ai-recipes: validate, call Gemini with the secret key, never leak upstream details. */
export async function handleAiRecipes(request: Request, env: AiEnv, fetchFn: typeof fetch = fetch): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method" }, 405, { allow: "POST" });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid" }, 400);
  }
  const validated = validateRequest(body);
  if (!validated.ok) return json({ error: "invalid" }, 400);
  if (!env.GEMINI_API_KEY) return json({ error: "unavailable" }, 502);

  try {
    const recipes = await callGemini({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL || DEFAULT_MODEL,
      ingredients: validated.ingredients,
      fetchFn,
    });
    return json({ recipes });
  } catch (error) {
    if (error instanceof AiQuotaError) return json({ error: "quota" }, 429);
    return json({ error: "unavailable" }, 502);
  }
}
