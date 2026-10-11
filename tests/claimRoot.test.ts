import { expect, test } from "vitest";
import { claimRoot } from "../src/ui/dom";

test("only the most recent claim on a root is current", () => {
  const root = document.createElement("div");
  const first = claimRoot(root);
  expect(first()).toBe(true);
  const second = claimRoot(root);
  expect(first()).toBe(false);
  expect(second()).toBe(true);
});

test("roots are independent", () => {
  const a = claimRoot(document.createElement("div"));
  claimRoot(document.createElement("div"));
  expect(a()).toBe(true);
});
