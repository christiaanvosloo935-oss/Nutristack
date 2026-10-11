import type { Recipe } from "../types";
import type { LibraryCache } from "./cache";

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export class LibraryUnavailableError extends Error {
  constructor() {
    super("Recipe library is unavailable: no connection and nothing saved yet");
    this.name = "LibraryUnavailableError";
  }
}

export interface LibraryDeps {
  cache: LibraryCache;
  fetchAll: () => Promise<Recipe[]>;
  now: () => number;
}

export async function loadLibrary({ cache, fetchAll, now }: LibraryDeps): Promise<{ recipes: Recipe[]; stale: boolean }> {
  const cached = await cache.get().catch(() => null);
  if (cached && now() - cached.savedAt < MAX_AGE_MS) {
    return { recipes: cached.recipes, stale: false };
  }
  try {
    const recipes = await fetchAll();
    await cache.put(recipes, now()).catch(() => undefined);
    return { recipes, stale: false };
  } catch {
    if (cached) return { recipes: cached.recipes, stale: true };
    throw new LibraryUnavailableError();
  }
}
