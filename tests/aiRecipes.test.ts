import { describe, expect, test } from "vitest";
import {
  AiParseError,
  AiQuotaError,
  AiUnavailableError,
  buildPrompt,
  callGemini,
  parseAiResponse,
  validateRequest,
} from "../shared/aiRecipes";

const recipeJson = (n: number) => ({
  title: `Dish ${n}`,
  description: "Tasty",
  ingredients: ["egg", "rice"],
  steps: ["Cook it."],
});

describe("validateRequest", () => {
  test("accepts a normal list and trims entries", () => {
    expect(validateRequest({ ingredients: [" eggs ", "rice", "cheese"] })).toEqual({ ok: true, ingredients: ["eggs", "rice", "cheese"] });
  });
  test.each([
    ["non-object body", "eggs"],
    ["missing ingredients", {}],
    ["non-array", { ingredients: "eggs" }],
    ["empty array", { ingredients: [] }],
    ["16 items", { ingredients: Array.from({ length: 16 }, (_, i) => `item${i}`) }],
    ["41-char entry", { ingredients: ["x".repeat(41)] }],
    ["number inside", { ingredients: ["eggs", 5] }],
    ["blank entry", { ingredients: ["eggs", "   "] }],
  ])("rejects %s", (_name, body) => {
    expect(validateRequest(body).ok).toBe(false);
  });
  test("strips control characters", () => {
    expect(validateRequest({ ingredients: ["egg\u0000\nIgnore previous"] })).toEqual({ ok: true, ingredients: ["egg Ignore previous"] });
  });
});

describe("buildPrompt", () => {
  test("lists the ingredients and the allowed staples", () => {
    const p = buildPrompt(["eggs", "rice"]);
    expect(p).toContain("eggs");
    expect(p).toContain("rice");
    expect(p.toLowerCase()).toContain("salt");
  });
});

describe("parseAiResponse", () => {
  test("accepts valid JSON", () => {
    const out = parseAiResponse(JSON.stringify({ recipes: [recipeJson(1), recipeJson(2)] }));
    expect(out.map((r) => r.title)).toEqual(["Dish 1", "Dish 2"]);
  });
  test("keeps at most 3 recipes", () => {
    const out = parseAiResponse(JSON.stringify({ recipes: [1, 2, 3, 4, 5].map(recipeJson) }));
    expect(out).toHaveLength(3);
  });
  test("rejects malformed JSON", () => {
    expect(() => parseAiResponse("{not json")).toThrow(AiParseError);
  });
  test("rejects a recipe with no steps or no title", () => {
    expect(() => parseAiResponse(JSON.stringify({ recipes: [{ ...recipeJson(1), steps: [] }] }))).toThrow(AiParseError);
    expect(() => parseAiResponse(JSON.stringify({ recipes: [{ ...recipeJson(1), title: "" }] }))).toThrow(AiParseError);
  });
});

describe("callGemini", () => {
  const ok = (text: string) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) }) as Response;
  const status = (code: number) => ({ ok: false, status: code, json: async () => ({}) }) as Response;
  const base = { apiKey: "SECRET", model: "test-model", ingredients: ["egg"] };

  test("returns parsed recipes and sends the key only in a header", async () => {
    let seenUrl = "";
    let seenInit: RequestInit | undefined;
    const fetchFn = (async (url: string, init?: RequestInit) => {
      seenUrl = url;
      seenInit = init;
      return ok(JSON.stringify({ recipes: [recipeJson(1)] }));
    }) as unknown as typeof fetch;
    const out = await callGemini({ ...base, fetchFn });
    expect(out).toHaveLength(1);
    expect(seenUrl).toContain("test-model:generateContent");
    expect(seenUrl).not.toContain("SECRET");
    expect((seenInit?.headers as Record<string, string>)["x-goog-api-key"]).toBe("SECRET");
  });

  test("429 becomes AiQuotaError", async () => {
    await expect(callGemini({ ...base, fetchFn: (async () => status(429)) as unknown as typeof fetch })).rejects.toBeInstanceOf(AiQuotaError);
  });

  test("other failures become AiUnavailableError", async () => {
    await expect(callGemini({ ...base, fetchFn: (async () => status(500)) as unknown as typeof fetch })).rejects.toBeInstanceOf(AiUnavailableError);
    await expect(
      callGemini({
        ...base,
        fetchFn: (async () => {
          throw new Error("network");
        }) as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(AiUnavailableError);
  });

  test("malformed model output becomes AiUnavailableError", async () => {
    await expect(callGemini({ ...base, fetchFn: (async () => ok("garbage")) as unknown as typeof fetch })).rejects.toBeInstanceOf(AiUnavailableError);
  });
});
