import "fake-indexeddb/auto";
import { describe, expect, test, vi } from "vitest";
import { LibraryUnavailableError, loadLibrary } from "../src/library";
import { createIdbCache, type LibraryCache } from "../src/library/cache";
import type { Recipe } from "../src/types";
import { omelette, tomatoPasta } from "./fixtures/recipes";

const DAY = 24 * 60 * 60 * 1000;

function memoryCache(initial: { recipes: Recipe[]; savedAt: number } | null = null) {
  let stored = initial;
  const put = vi.fn(async (recipes: Recipe[], savedAt: number) => {
    stored = { recipes, savedAt };
  });
  const cache: LibraryCache = { get: async () => stored, put };
  return { cache, put };
}

describe("loadLibrary", () => {
  test("returns a fresh cache without fetching", async () => {
    const { cache } = memoryCache({ recipes: [omelette], savedAt: 1000 });
    const fetchAll = vi.fn(async () => [tomatoPasta]);
    const result = await loadLibrary({ cache, fetchAll, now: () => 1000 + 6 * DAY });
    expect(result).toEqual({ recipes: [omelette], stale: false });
    expect(fetchAll).not.toHaveBeenCalled();
  });

  test("fetches and stores when there is no cache", async () => {
    const { cache, put } = memoryCache();
    const result = await loadLibrary({ cache, fetchAll: async () => [tomatoPasta], now: () => 5000 });
    expect(result).toEqual({ recipes: [tomatoPasta], stale: false });
    expect(put).toHaveBeenCalledWith([tomatoPasta], 5000);
  });

  test("refreshes a cache older than 7 days", async () => {
    const { cache, put } = memoryCache({ recipes: [omelette], savedAt: 0 });
    const result = await loadLibrary({ cache, fetchAll: async () => [tomatoPasta], now: () => 8 * DAY });
    expect(result.recipes).toEqual([tomatoPasta]);
    expect(put).toHaveBeenCalledOnce();
  });

  test("falls back to an old cache, marked stale, when the fetch fails", async () => {
    const { cache, put } = memoryCache({ recipes: [omelette], savedAt: 0 });
    const result = await loadLibrary({
      cache,
      fetchAll: async () => {
        throw new Error("offline");
      },
      now: () => 8 * DAY,
    });
    expect(result).toEqual({ recipes: [omelette], stale: true });
    expect(put).not.toHaveBeenCalled();
  });

  test("throws LibraryUnavailableError and writes nothing when offline with no cache", async () => {
    const { cache, put } = memoryCache();
    await expect(
      loadLibrary({
        cache,
        fetchAll: async () => {
          throw new Error("offline");
        },
        now: () => 0,
      }),
    ).rejects.toBeInstanceOf(LibraryUnavailableError);
    expect(put).not.toHaveBeenCalled();
  });
});

describe("createIdbCache", () => {
  test("round-trips recipes and savedAt", async () => {
    const cache = createIdbCache();
    expect(await cache.get()).toBeNull();
    await cache.put([omelette], 1234);
    expect(await cache.get()).toEqual({ recipes: [omelette], savedAt: 1234 });
  });
});
