// @vitest-environment node
import { describe, expect, test } from "vitest";
import { handleAiRecipes } from "../shared/aiHandler";

const recipe = { title: "Dish", description: "d", ingredients: ["egg"], steps: ["Cook."] };
const geminiOk = () =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ recipes: [recipe] }) }] } }] }), { status: 200 });

const post = (body: unknown) =>
  new Request("https://app.test/api/ai-recipes", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

const env = { GEMINI_API_KEY: "SECRET" };

describe("handleAiRecipes", () => {
  test("returns recipes on success and never echoes the key", async () => {
    const res = await handleAiRecipes(post({ ingredients: ["egg"] }), env, async () => geminiOk());
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text).recipes).toHaveLength(1);
    expect(text).not.toContain("SECRET");
  });

  test("rejects non-POST with 405", async () => {
    const res = await handleAiRecipes(new Request("https://app.test/api/ai-recipes"), env);
    expect(res.status).toBe(405);
  });

  test("rejects invalid JSON and invalid ingredients with 400", async () => {
    expect((await handleAiRecipes(post("{not json"), env)).status).toBe(400);
    expect((await handleAiRecipes(post({ ingredients: [] }), env)).status).toBe(400);
    expect((await handleAiRecipes(post({ ingredients: [5] }), env)).status).toBe(400);
  });

  test("a missing key gives a generic 502, not a crash", async () => {
    const res = await handleAiRecipes(post({ ingredients: ["egg"] }), {});
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "unavailable" });
  });

  test("a Gemini 429 becomes 429 quota", async () => {
    const res = await handleAiRecipes(post({ ingredients: ["egg"] }), env, async () => new Response("{}", { status: 429 }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "quota" });
  });

  test("other Gemini failures become a generic 502 with no upstream text", async () => {
    const res = await handleAiRecipes(post({ ingredients: ["egg"] }), env, async () => new Response("secret upstream detail", { status: 500 }));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("upstream");
  });

  test("uses GEMINI_MODEL when set", async () => {
    let url = "";
    await handleAiRecipes(post({ ingredients: ["egg"] }), { ...env, GEMINI_MODEL: "my-model" }, async (u) => {
      url = String(u);
      return geminiOk();
    });
    expect(url).toContain("my-model:generateContent");
  });
});
