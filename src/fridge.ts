import { normalizeIngredient } from "./ingredients/normalize";

const KEY = "nutristack.fridge";

type FridgeStorage = Pick<Storage, "getItem" | "setItem">;

function read(storage: FridgeStorage): string[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function createFridge(storage: FridgeStorage) {
  let items = read(storage);

  function save(): void {
    try {
      storage.setItem(KEY, JSON.stringify(items));
    } catch {
      // Storage unavailable (private mode / quota): keep working in memory.
    }
  }

  return {
    list(): string[] {
      return [...items];
    },
    add(name: string): boolean {
      const display = name.trim();
      const key = normalizeIngredient(display);
      if (!key || items.some((i) => normalizeIngredient(i) === key)) return false;
      items.push(display);
      save();
      return true;
    },
    remove(name: string): void {
      const key = normalizeIngredient(name);
      items = items.filter((i) => normalizeIngredient(i) !== key);
      save();
    },
  };
}
