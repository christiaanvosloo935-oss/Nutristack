import { AiQuotaError } from "../../shared/aiRecipes";
import { matchRecipes } from "../matcher";
import type { AiRecipe, Match, Recipe } from "../types";
import { claimRoot, h } from "./dom";

export interface ResultsDeps {
  fridge: string[];
  recipes: Recipe[];
  stale: boolean;
  fetchAi: (ingredients: string[]) => Promise<AiRecipe[]>;
  onOpen: (id: string) => void;
}

type Filter = "all" | "ready" | "missing";

const FILTERS: Array<[Filter, string]> = [
  ["all", "All"],
  ["ready", "Ready to cook"],
  ["missing", "Missing 1-2"],
];

function matchCard(m: Match, onOpen: (id: string) => void): HTMLElement {
  const total = m.have.length + m.missing.length;
  const ready = m.missing.length === 0;
  return h(
    "button",
    { class: "card", type: "button", onclick: () => onOpen(m.recipe.id) },
    h("img", { src: m.recipe.thumb, alt: "", loading: "lazy" }),
    h(
      "div",
      { class: "card-body" },
      h("div", { class: "card-title" }, m.recipe.name),
      h("span", { class: `badge ${ready ? "ready" : "missing"}` }, `${m.have.length}/${total} ingredients`),
      !ready && h("div", { class: "need" }, `Need: ${m.missing.join(", ")}`),
    ),
  );
}

function aiCard(r: AiRecipe): HTMLElement {
  return h(
    "details",
    { class: "ai-card" },
    h("summary", {}, h("strong", {}, r.title), h("span", { class: "ai-label" }, "AI suggestion, not kitchen-tested")),
    r.description && h("p", {}, r.description),
    r.basedOn && h("p", { class: "hint" }, `Based on: ${r.basedOn}`),
    h("h3", {}, "Ingredients"),
    h("ul", {}, ...r.ingredients.map((i) => h("li", {}, i))),
    h("h3", {}, "Steps"),
    h("ol", {}, ...r.steps.map((s) => h("li", {}, s))),
  );
}

export function renderResultsScreen(root: HTMLElement, deps: ResultsDeps): void {
  const { fridge, recipes, stale, fetchAi, onOpen } = deps;
  const isCurrent = claimRoot(root);
  const matches = matchRecipes(fridge, recipes);
  const categories = [...new Set(matches.map((m) => m.recipe.category).filter(Boolean))].sort();

  let filter: Filter = "all";
  let category: string | null = null;
  let aiCards: AiRecipe[] = [];
  let aiLoading = false;
  let aiError = "";

  async function loadAi(): Promise<void> {
    aiLoading = true;
    aiError = "";
    render();
    try {
      aiCards = [...aiCards, ...(await fetchAi(fridge))];
    } catch (error) {
      aiError =
        error instanceof AiQuotaError
          ? "Free AI limit reached for today, try again tomorrow."
          : "AI suggestions are unavailable right now.";
    }
    if (!isCurrent()) return;
    aiLoading = false;
    render();
  }

  function visible(): Match[] {
    return matches.filter((m) => {
      if (filter === "ready" && m.missing.length > 0) return false;
      if (filter === "missing" && m.missing.length === 0) return false;
      return category === null || m.recipe.category === category;
    });
  }

  function aiSection(): HTMLElement {
    return h(
      "section",
      { class: "ai-section" },
      h("h2", {}, "AI recipe ideas"),
      h(
        "button",
        {
          class: `ai-suggest primary${matches.length === 0 ? " highlight" : ""}`,
          type: "button",
          disabled: aiLoading,
          onclick: () => void loadAi(),
        },
        aiLoading ? "Thinking…" : aiCards.length ? "Suggest more AI recipes" : "Suggest AI recipes",
      ),
      aiError && h("p", { class: "ai-error" }, aiError),
      ...aiCards.map(aiCard),
      aiCards.length > 0 &&
        h("button", { class: "ai-more", type: "button", disabled: aiLoading, onclick: () => void loadAi() }, "Give me 3 more"),
    );
  }

  function render(): void {
    if (!isCurrent()) return;
    const back = h("a", { class: "back", href: "#/" }, "← Edit ingredients");

    if (fridge.length === 0) {
      root.replaceChildren(
        h("main", { class: "screen results" }, back, h("p", { class: "empty" }, "Add some food first, then we can find recipes.")),
      );
      return;
    }

    const list = visible();
    root.replaceChildren(
      h(
        "main",
        { class: "screen results" },
        back,
        h("h1", {}, "Recipes you can make"),
        stale && h("p", { class: "notice" }, "You're offline, showing saved recipes."),
        matches.length > 0 &&
          h(
            "div",
            { class: "filters" },
            ...FILTERS.map(([id, label]) =>
              h("button", { type: "button", "aria-pressed": String(filter === id), onclick: () => { filter = id; render(); } }, label),
            ),
          ),
        matches.length > 0 &&
          h(
            "div",
            { class: "categories" },
            ...categories.map((c) =>
              h("button", { type: "button", "aria-pressed": String(category === c), onclick: () => { category = category === c ? null : c; render(); } }, c),
            ),
          ),
        matches.length === 0
          ? h("p", { class: "empty" }, "No recipes match yet. Add more food, or try the AI ideas below.")
          : list.length === 0
            ? h("p", { class: "empty" }, "Nothing matches these filters.")
            : h("div", { class: "grid" }, ...list.map((m) => matchCard(m, onOpen))),
        aiSection(),
      ),
    );
  }

  render();
}
