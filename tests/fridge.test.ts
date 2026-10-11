import { describe, expect, test } from "vitest";
import { createFridge } from "../src/fridge";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

describe("createFridge", () => {
  test("add trims and stores the display name", () => {
    const fridge = createFridge(memoryStorage());
    expect(fridge.add("Eggs ")).toBe(true);
    expect(fridge.list()).toEqual(["Eggs"]);
  });

  test("a duplicate by normalised name is rejected", () => {
    const fridge = createFridge(memoryStorage());
    fridge.add("Eggs ");
    expect(fridge.add("egg")).toBe(false);
    expect(fridge.list()).toEqual(["Eggs"]);
  });

  test("blank input is rejected", () => {
    const fridge = createFridge(memoryStorage());
    expect(fridge.add("   ")).toBe(false);
    expect(fridge.list()).toEqual([]);
  });

  test("remove matches by normalised name", () => {
    const fridge = createFridge(memoryStorage());
    fridge.add("Eggs");
    fridge.remove("egg");
    expect(fridge.list()).toEqual([]);
  });

  test("persists across instances on the same storage", () => {
    const storage = memoryStorage();
    createFridge(storage).add("Rice");
    expect(createFridge(storage).list()).toEqual(["Rice"]);
  });

  test("corrupt stored JSON gives an empty list", () => {
    const fridge = createFridge(memoryStorage({ "nutristack.fridge": "{not json" }));
    expect(fridge.list()).toEqual([]);
  });

  test("a storage that throws on write still works in memory", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    const fridge = createFridge(storage);
    expect(() => fridge.add("Rice")).not.toThrow();
    expect(fridge.list()).toEqual(["Rice"]);
  });
});
