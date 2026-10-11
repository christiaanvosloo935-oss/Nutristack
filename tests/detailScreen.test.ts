import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderDetailScreen } from "../src/ui/detailScreen";
import type { Match } from "../src/types";
import { omelette } from "./fixtures/recipes";

let root: HTMLElement;
const onBack = vi.fn<() => void>();

const match: Match = {
  recipe: { ...omelette, instructions: "Beat eggs.\r\n\r\nCook in butter.\n \nServe.", source: "https://example.com/omelette" },
  have: ["Eggs"],
  missing: ["Cheese"],
  staples: ["Butter", "Salt"],
};

const items = (selector: string) => [...root.querySelectorAll(`${selector} li`)].map((li) => li.textContent);

beforeEach(() => {
  root = document.createElement("div");
  onBack.mockClear();
  renderDetailScreen(root, match, onBack);
});

describe("recipe detail", () => {
  test("shows the photo and name", () => {
    expect(root.querySelector("img")!.getAttribute("src")).toBe("https://img.test/1.jpg");
    expect(root.querySelector("h1")!.textContent).toBe("Cheese Omelette");
  });

  test("lists have / need / staples with measures, staples only under 'also need'", () => {
    expect(items(".have")).toEqual(["1 Eggs"]);
    expect(items(".missing")).toEqual(["1 Cheese"]);
    expect(items(".staples")).toEqual(["1 Butter", "1 Salt"]);
    expect(root.querySelector(".staples h2")!.textContent).toBe("You'll also need");
  });

  test("steps drop blank lines", () => {
    expect(items(".steps")).toEqual(["Beat eggs.", "Cook in butter.", "Serve."]);
  });

  test("source link opens safely, and is absent when there is no source", () => {
    const link = root.querySelector<HTMLAnchorElement>("a.source")!;
    expect(link.getAttribute("href")).toBe("https://example.com/omelette");
    expect(link.getAttribute("rel")).toContain("noopener");
    const other = document.createElement("div");
    renderDetailScreen(other, { ...match, recipe: { ...match.recipe, source: undefined } }, onBack);
    expect(other.querySelector("a.source")).toBeNull();
  });

  test("empty groups are not rendered", () => {
    const other = document.createElement("div");
    renderDetailScreen(other, { ...match, missing: [] }, onBack);
    expect(other.querySelector(".missing")).toBeNull();
  });

  test("back button calls onBack", () => {
    root.querySelector<HTMLButtonElement>("button.back")!.click();
    expect(onBack).toHaveBeenCalledOnce();
  });
});
