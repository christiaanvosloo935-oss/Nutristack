import { describe, expect, test } from "vitest";
import { estimateEffort, formatMinutes, groupByEffort, levelForMinutes } from "../src/effort";
import type { Match } from "../src/types";
import { recipe } from "./fixtures/recipes";

const names = (n: number) => Array.from({ length: n }, (_, i) => `Ingredient ${i}`);
const make = (n: number, instructions: string) => ({ ingredients: names(n).map((name) => ({ name, measure: "1" })), instructions });

describe("levelForMinutes", () => {
  test.each([
    [10, "quick"],
    [30, "quick"],
    [31, "medium"],
    [60, "medium"],
    [61, "long"],
    [480, "long"],
  ])("%d min -> %s", (minutes, level) => {
    expect(levelForMinutes(minutes)).toBe(level);
  });
});

describe("estimateEffort from written durations", () => {
  test("a short fry is quick", () => {
    const e = estimateEffort(make(3, "Whisk the eggs. Fry for 5 minutes."));
    expect(e.level).toBe("quick");
    expect(e.minutes).toBe(10);
  });

  test("durations are added up and prep time is included", () => {
    expect(estimateEffort(make(8, "Simmer for 45 minutes.")).minutes).toBe(55);
  });

  test("a range uses its upper end", () => {
    expect(estimateEffort(make(3, "Bake for 20-25 minutes.")).minutes).toBe(30);
  });

  test("hours, mixed units and fractions", () => {
    expect(estimateEffort(make(3, "Roast for 2 hours.")).level).toBe("long");
    expect(estimateEffort(make(3, "Simmer for 1 1/2 hours.")).minutes).toBe(95);
    expect(estimateEffort(make(3, "Rest for half an hour.")).minutes).toBe(35);
    expect(estimateEffort(make(3, "Roast for 1 hour 30 minutes.")).minutes).toBe(95);
  });

  test("words that only look like durations are ignored", () => {
    expect(estimateEffort(make(3, "Add 5 minced cloves and 2 hot peppers at 180C.")).minutes).toBeLessThan(30);
  });

  test("overnight steps make it long", () => {
    const e = estimateEffort(make(4, "Marinate overnight, then grill for 10 minutes."));
    expect(e.level).toBe("long");
    expect(e.minutes).toBeGreaterThanOrEqual(480);
  });
});

describe("estimateEffort without written durations", () => {
  test("a short simple recipe is quick", () => {
    expect(estimateEffort(make(3, "Mix it. Heat it. Serve it.")).level).toBe("quick");
  });
  test("a busier recipe is medium", () => {
    const steps = Array.from({ length: 15 }, (_, i) => `Do step ${i}.`).join(" ");
    expect(estimateEffort(make(12, steps)).level).toBe("medium");
  });
  test("a very long, many-ingredient recipe is long", () => {
    const steps = Array.from({ length: 25 }, (_, i) => `Do step ${i}.`).join(" ");
    expect(estimateEffort(make(18, steps)).level).toBe("long");
  });
  test("empty instructions and no ingredients do not crash", () => {
    const e = estimateEffort({ ingredients: [], instructions: "" });
    expect(e.level).toBe("quick");
    expect(e.minutes).toBeGreaterThanOrEqual(10);
  });
});

describe("formatMinutes", () => {
  test.each([
    [25, "~25 min"],
    [60, "~1 h"],
    [90, "~1 h 30 min"],
    [480, "~8 h"],
  ])("%d -> %s", (m, text) => expect(formatMinutes(m)).toBe(text));
});

describe("groupByEffort", () => {
  const match = (id: string, instructions: string): Match => ({
    recipe: { ...recipe(id, `R${id}`, ["Egg"]), instructions },
    have: ["Egg"],
    missing: [],
    staples: [],
  });

  test("orders groups quick, medium, long, keeps input order inside, and omits empty groups", () => {
    const groups = groupByEffort([match("1", "Roast for 2 hours."), match("2", "Fry for 5 minutes."), match("3", "Fry for 3 minutes."), match("4", "Simmer for 40 minutes.")]);
    expect(groups.map((g) => g.level)).toEqual(["quick", "medium", "long"]);
    expect(groups[0].matches.map((m) => m.recipe.id)).toEqual(["2", "3"]);
    expect(groupByEffort([match("2", "Fry for 5 minutes.")]).map((g) => g.level)).toEqual(["quick"]);
  });
});
