import type { Match, RecipeIngredient } from "../types";
import { EFFORT_LEVELS, estimateEffort, formatMinutes } from "../effort";
import { h } from "./dom";

function group(className: string, title: string, names: string[], recipeIngredients: RecipeIngredient[]): HTMLElement | false {
  if (names.length === 0) return false;
  const measureOf = (name: string) => recipeIngredients.find((i) => i.name === name)?.measure ?? "";
  return h(
    "section",
    { class: className },
    h("h2", {}, title),
    h("ul", {}, ...names.map((n) => h("li", {}, `${measureOf(n)} ${n}`.trim()))),
  );
}

export function renderDetailScreen(root: HTMLElement, match: Match, onBack: () => void): void {
  const { recipe } = match;
  const steps = recipe.instructions
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const effort = estimateEffort(recipe);
  const effortTitle = EFFORT_LEVELS.find((l) => l.level === effort.level)!.title;
  const hasSource = recipe.source !== undefined && /^https?:\/\//i.test(recipe.source);

  root.replaceChildren(
    h(
      "main",
      { class: "screen detail" },
      h("button", { class: "back", type: "button", onclick: () => onBack() }, "← Back to recipes"),
      h("img", { class: "hero", src: recipe.thumb, alt: recipe.name }),
      h("h1", {}, recipe.name),
      h("p", { class: "hint" }, [recipe.category, recipe.area].filter(Boolean).join(" · ")),
      h("p", { class: "effort" }, `${formatMinutes(effort.minutes)} · ${effortTitle} (estimated)`),
      group("have", "You have", match.have, recipe.ingredients),
      group("missing", "You need to get", match.missing, recipe.ingredients),
      group("staples", "You'll also need", match.staples, recipe.ingredients),
      h("section", { class: "steps-section" }, h("h2", {}, "Steps"), h("ol", { class: "steps" }, ...steps.map((s) => h("li", {}, s)))),
      hasSource && h("a", { class: "source", href: recipe.source!, target: "_blank", rel: "noopener noreferrer" }, "View original recipe"),
    ),
  );
}
