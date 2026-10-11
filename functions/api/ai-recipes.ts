import { AiQuotaError, DEFAULT_MODEL, callGemini, validateRequest } from "../../shared/aiRecipes";

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
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
    });
    return json({ recipes });
  } catch (error) {
    if (error instanceof AiQuotaError) return json({ error: "quota" }, 429);
    return json({ error: "unavailable" }, 502);
  }
};
