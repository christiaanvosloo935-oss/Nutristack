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
