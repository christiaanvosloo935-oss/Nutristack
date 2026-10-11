import { expect, test } from "vitest";
import type { Recipe } from "../src/types";

test("Recipe type can be constructed", () => {
  const r: Recipe = { id: "1", name: "x", category: "", area: "", thumb: "", ingredients: [], instructions: "" };
  expect(r.id).toBe("1");
});
