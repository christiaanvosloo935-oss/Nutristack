import { beforeEach, describe, expect, test, vi } from "vitest";
import { AiQuotaError, AiUnavailableError } from "../shared/aiRecipes";
import { claimRoot } from "../src/ui/dom";
import { renderResultsScreen } from "../src/ui/resultsScreen";
import type { AiRecipe } from "../src/types";
import { chickenRice, omelette, tomatoPasta } from "./fixtures/recipes";

const aiRecipes: AiRecipe[] = [1, 2, 3].map((n) => ({ title: `AI Dish ${n}`, description: "d", ingredients: ["egg"], steps: ["Cook."], minutes: 20 }));

let root: HTMLElement;
let fetchAi: ReturnType<typeof vi.fn<(ing: string[]) => Promise<AiRecipe[]>>>;
let onOpen: ReturnType<typeof vi.fn<(id: string) => void>>;

const fridge = ["eggs", "cheese", "chicken", "rice", "onion", "garlic"];

function mount(overrides: Partial<Parameters<typeof renderResultsScreen>[1]> = {}) {
  renderResultsScreen(root, { fridge, recipes: [omelette, tomatoPasta, chickenRice], stale: false, fetchAi, onOpen, ...overrides });
}
const cards = () => [...root.querySelectorAll<HTMLElement>(".grid .card")];
const names = () => cards().map((c) => c.querySelector(".card-title")!.textContent);
const click = (selector: string, text?: string) =>
  [...root.querySelectorAll<HTMLButtonElement>(selector)].find((b) => !text || b.textContent === text)!.click();

beforeEach(() => {
  root = document.createElement("div");
  fetchAi = vi.fn<(ing: string[]) => Promise<AiRecipe[]>>(async () => aiRecipes);
  onOpen = vi.fn<(id: string) => void>();
});

describe("real recipes", () => {
  test("renders ranked cards with photo, name and badge", () => {
    mount();
    expect(names()).toEqual(["Cheese Omelette", "Chicken Rice", "Tomato Pasta"]);
    const first = cards()[0];
    expect(first.querySelector("img")!.getAttribute("src")).toBe("https://img.test/1.jpg");
    expect(first.querySelector(".badge")!.textContent).toBe("2/2 ingredients");
    expect(first.querySelector(".badge")!.classList.contains("ready")).toBe(true);
  });

  test("a card with missing items shows what to get", () => {
    mount();
    const card = cards()[1];
    expect(card.querySelector(".badge")!.textContent).toBe("4/6 ingredients");
    expect(card.querySelector(".need")!.textContent).toBe("Need: Soy Sauce, Ginger");
  });

  test("Ready to cook hides recipes with missing items; Missing 1-2 hides ready ones", () => {
    mount();
    click(".filters button", "Ready to cook");
    expect(names()).toEqual(["Cheese Omelette"]);
    click(".filters button", "Missing 1-2");
    expect(names()).toEqual(["Chicken Rice", "Tomato Pasta"]);
    click(".filters button", "All");
    expect(names()).toHaveLength(3);
  });

  test("a category chip filters, and tapping it again clears it", () => {
    mount();
    click(".categories button", "Chicken");
    expect(names()).toEqual(["Chicken Rice"]);
    click(".categories button", "Chicken");
    expect(names()).toHaveLength(3);
  });

  test("tapping a card opens that recipe", () => {
    mount();
    cards()[0].click();
    expect(onOpen).toHaveBeenCalledWith("1");
  });

  test("shows a note when the saved library is out of date", () => {
    mount({ stale: true });
    expect(root.querySelector(".notice")!.textContent).toContain("saved recipes");
  });

  test("an empty fridge asks for food and shows no cards", () => {
    mount({ fridge: [] });
    expect(cards()).toHaveLength(0);
    expect(root.querySelector(".empty")!.textContent).toContain("Add some food first");
    expect(fetchAi).not.toHaveBeenCalled();
  });

  test("no matches says so and highlights the AI button", () => {
    mount({ fridge: ["dragon fruit"] });
    expect(root.querySelector(".empty")!.textContent).toContain("No recipes match yet");
    expect(root.querySelector(".ai-suggest")!.classList.contains("highlight")).toBe(true);
  });
});

describe("effort levels", () => {
  const slowOmelette = { ...omelette, id: "11", name: "Slow Omelette", instructions: "Cook gently for 3 hours." };
  const slowStew = { ...tomatoPasta, id: "12", name: "Slow Pasta", instructions: "Simmer for 3 hours." };

  test("groups cards under Quick / Medium / Long headings, quickest first, empty levels hidden", () => {
    mount({ recipes: [slowOmelette, omelette, chickenRice] });
    const titles = [...root.querySelectorAll(".level-title")].map((t) => t.textContent);
    expect(titles).toEqual(["⚡ Quick · under 30 min", "🍲 Long · over an hour"]);
    const groups = [...root.querySelectorAll(".level-group")];
    expect([...groups[0].querySelectorAll(".card-title")].map((t) => t.textContent)).toEqual(["Cheese Omelette", "Chicken Rice"]);
    expect([...groups[1].querySelectorAll(".card-title")].map((t) => t.textContent)).toEqual(["Slow Omelette"]);
  });

  test("each card shows its estimated time", () => {
    mount({ recipes: [omelette] });
    expect(cards()[0].querySelector(".time")!.textContent).toBe("~10 min");
  });

  test("filters apply across groups and a group with no visible cards disappears", () => {
    mount({ recipes: [omelette, slowStew] });
    click(".filters button", "Ready to cook");
    expect([...root.querySelectorAll(".level-title")].map((t) => t.textContent)).toEqual(["⚡ Quick · under 30 min"]);
    expect(names()).toEqual(["Cheese Omelette"]);
  });
});

describe("AI section", () => {
  test("does not call the AI until the button is tapped", () => {
    mount();
    expect(fetchAi).not.toHaveBeenCalled();
    expect(root.querySelectorAll(".ai-card")).toHaveLength(0);
  });

  test("tapping shows 3 cards, each labelled as not kitchen-tested", async () => {
    mount();
    click(".ai-suggest");
    await vi.waitFor(() => expect(root.querySelectorAll(".ai-card")).toHaveLength(3));
    expect(fetchAi).toHaveBeenCalledWith(fridge);
    for (const card of root.querySelectorAll(".ai-card")) {
      expect(card.querySelector(".ai-label")!.textContent).toBe("AI suggestion, not kitchen-tested");
    }
  });

  test("AI cards show their time when given", async () => {
    mount();
    click(".ai-suggest");
    await vi.waitFor(() => expect(root.querySelectorAll(".ai-card")).toHaveLength(3));
    expect(root.querySelector(".ai-time")!.textContent).toBe("~20 min");
  });

  test("Give me 3 more appends another batch", async () => {
    mount();
    click(".ai-suggest");
    await vi.waitFor(() => expect(root.querySelector(".ai-more")).not.toBeNull());
    click(".ai-more");
    await vi.waitFor(() => expect(root.querySelectorAll(".ai-card")).toHaveLength(6));
  });

  test("quota error shows a friendly message and keeps the real recipes", async () => {
    fetchAi.mockRejectedValueOnce(new AiQuotaError());
    mount();
    click(".ai-suggest");
    await vi.waitFor(() => expect(root.querySelector(".ai-error")).not.toBeNull());
    expect(root.querySelector(".ai-error")!.textContent).toContain("try again tomorrow");
    expect(cards()).toHaveLength(3);
  });

  test("an unavailable AI shows its own message", async () => {
    fetchAi.mockRejectedValueOnce(new AiUnavailableError());
    mount();
    click(".ai-suggest");
    await vi.waitFor(() => expect(root.querySelector(".ai-error")!.textContent).toContain("unavailable"));
  });

  test("a late AI answer does not overwrite a screen the user has moved to", async () => {
    let resolve!: (r: AiRecipe[]) => void;
    fetchAi.mockImplementationOnce(() => new Promise<AiRecipe[]>((r) => (resolve = r)));
    mount();
    click(".ai-suggest");
    claimRoot(root);
    root.replaceChildren("OTHER SCREEN");
    resolve(aiRecipes);
    await new Promise((r) => setTimeout(r, 0));
    expect(root.textContent).toBe("OTHER SCREEN");
  });
});
