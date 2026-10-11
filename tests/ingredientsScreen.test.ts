import { beforeEach, describe, expect, test, vi } from "vitest";
import { createFridge } from "../src/fridge";
import { claimRoot } from "../src/ui/dom";
import { renderIngredientsScreen } from "../src/ui/ingredientsScreen";
import { startRouter } from "../src/ui/router";

function memoryStorage() {
  const data: Record<string, string> = {};
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
}

let root: HTMLElement;
let fridge: ReturnType<typeof createFridge>;
let onFind: ReturnType<typeof vi.fn<() => void>>;

const vocab = ["chicken", "chickpea", "rice", "stir-fried chili"];

let screen: ReturnType<typeof renderIngredientsScreen>;

function mount(initialVocab = vocab) {
  root.innerHTML = "";
  screen = renderIngredientsScreen(root, { fridge, vocab: initialVocab, onFind });
}
const input = () => root.querySelector<HTMLInputElement>("input[type=search]")!;
const chips = () => [...root.querySelectorAll(".chips .chip")].map((c) => c.firstChild?.textContent);
const type = (value: string) => {
  input().value = value;
  input().dispatchEvent(new Event("input", { bubbles: true }));
};
const submit = () => root.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

beforeEach(() => {
  root = document.createElement("div");
  fridge = createFridge(memoryStorage());
  onFind = vi.fn<() => void>();
  mount();
});

describe("ingredients screen", () => {
  test("typing shows suggestions", () => {
    type("chi");
    expect([...root.querySelectorAll(".suggestions button")].map((b) => b.textContent)).toEqual(["chicken", "chickpea", "stir-fried chili"]);
  });

  test("tapping a suggestion adds a chip and clears the input", () => {
    type("chi");
    root.querySelector<HTMLButtonElement>(".suggestions button")!.click();
    expect(chips()).toEqual(["chicken"]);
    expect(input().value).toBe("");
    expect(root.querySelectorAll(".suggestions button")).toHaveLength(0);
  });

  test("the remove button removes the chip", () => {
    fridge.add("rice");
    mount();
    root.querySelector<HTMLButtonElement>(".chip-remove")!.click();
    expect(chips()).toEqual([]);
    expect(fridge.list()).toEqual([]);
  });

  test("tapping a quick-add chip adds it and hides it from the quick-add row", () => {
    const eggs = [...root.querySelectorAll<HTMLButtonElement>(".quick-add button")].find((b) => b.textContent === "eggs")!;
    eggs.click();
    expect(chips()).toEqual(["eggs"]);
    expect([...root.querySelectorAll(".quick-add button")].map((b) => b.textContent)).not.toContain("eggs");
  });

  test("a duplicate does not add a second chip", () => {
    type("Eggs");
    submit();
    type("egg");
    submit();
    expect(chips()).toEqual(["Eggs"]);
  });

  test("submitting free text adds it", () => {
    type("  dragon fruit ");
    submit();
    expect(chips()).toEqual(["dragon fruit"]);
  });

  test("Find recipes is disabled until something is added, then calls onFind", () => {
    const find = () => root.querySelector<HTMLButtonElement>("button.find")!;
    expect(find().disabled).toBe(true);
    type("rice");
    submit();
    expect(find().disabled).toBe(false);
    find().click();
    expect(onFind).toHaveBeenCalledOnce();
  });

  test("ingredient names are rendered as text, never as HTML", () => {
    type("<img src=x onerror=alert(1)>");
    submit();
    expect(root.querySelector(".chips img")).toBeNull();
  });
});

describe("quick-add tiles", () => {
  test("each tile shows an emoji icon above its label", () => {
    const tiles = [...root.querySelectorAll(".quick-add button.tile")];
    expect(tiles).toHaveLength(12);
    expect(tiles[0].querySelector(".tile-icon")!.getAttribute("data-emoji")).toBe("🥚");
    expect(tiles[0].querySelector(".tile-label")!.textContent).toBe("eggs");
  });
});

describe("setVocab", () => {
  test("updates suggestions without rebuilding the input or losing typed text", () => {
    mount([]);
    const before = input();
    type("ch");
    expect(root.querySelectorAll(".suggestions button")).toHaveLength(0);
    screen.setVocab(["chicken"]);
    expect(input()).toBe(before);
    expect(input().value).toBe("ch");
    expect([...root.querySelectorAll(".suggestions button")].map((b) => b.textContent)).toEqual(["chicken"]);
  });

  test("does nothing once another screen has taken over the root", () => {
    mount([]);
    claimRoot(root);
    root.replaceChildren("OTHER SCREEN");
    screen.setVocab(["chicken"]);
    expect(root.textContent).toBe("OTHER SCREEN");
  });
});

describe("input limits", () => {
  test("the add box limits entries to 40 characters", () => {
    expect(input().maxLength).toBe(40);
  });
});

describe("startRouter", () => {
  test("dispatches by hash with params and falls back to home", () => {
    const home = vi.fn();
    const recipe = vi.fn();
    window.location.hash = "#/recipe/52772";
    startRouter({ "": home, recipe });
    expect(recipe).toHaveBeenCalledWith(["52772"]);
    window.location.hash = "#/nonsense";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(home).toHaveBeenCalled();
  });
});
