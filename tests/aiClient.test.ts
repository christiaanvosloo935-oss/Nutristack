import { describe, expect, test } from "vitest";
import { fetchAiRecipes } from "../src/ai/client";
import { AiQuotaError, AiUnavailableError } from "../shared/aiRecipes";

const reply = (status: number, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;
const recipes = [{ title: "T", description: "", ingredients: [], steps: ["s"] }];

describe("fetchAiRecipes", () => {
  test("POSTs the ingredients and returns recipes", async () => {
    let seen: { url: string; init?: RequestInit } | undefined;
    const fetchFn = (async (url: string, init?: RequestInit) => {
      seen = { url, init };
      return reply(200, { recipes });
    }) as unknown as typeof fetch;
    expect(await fetchAiRecipes(["egg"], fetchFn)).toEqual(recipes);
    expect(seen?.url).toBe("/api/ai-recipes");
    expect(seen?.init?.method).toBe("POST");
    expect(JSON.parse(seen?.init?.body as string)).toEqual({ ingredients: ["egg"] });
  });

  test("429 becomes AiQuotaError", async () => {
    await expect(fetchAiRecipes(["egg"], (async () => reply(429)) as unknown as typeof fetch)).rejects.toBeInstanceOf(AiQuotaError);
  });

  test("502 becomes AiUnavailableError", async () => {
    await expect(fetchAiRecipes(["egg"], (async () => reply(502)) as unknown as typeof fetch)).rejects.toBeInstanceOf(AiUnavailableError);
  });

  test("a network failure becomes AiUnavailableError", async () => {
    const fetchFn = (async () => {
      throw new TypeError("offline");
    }) as unknown as typeof fetch;
    await expect(fetchAiRecipes(["egg"], fetchFn)).rejects.toBeInstanceOf(AiUnavailableError);
  });
});

describe("fetchAiRecipes input limits", () => {
  test("sends at most 15 trimmed, non-empty items of at most 40 characters", async () => {
    let sent: string[] = [];
    const fetchFn = (async (_url: string, init?: RequestInit) => {
      sent = JSON.parse(init?.body as string).ingredients;
      return reply(200, { recipes });
    }) as unknown as typeof fetch;
    const fridge = ["  eggs  ", "", "   ", "x".repeat(60), ...Array.from({ length: 20 }, (_, i) => `item ${i}`)];
    await fetchAiRecipes(fridge, fetchFn);
    expect(sent).toHaveLength(15);
    expect(sent[0]).toBe("eggs");
    expect(sent[1]).toBe("x".repeat(40));
    expect(sent.every((s) => s.length >= 1 && s.length <= 40)).toBe(true);
  });
});
