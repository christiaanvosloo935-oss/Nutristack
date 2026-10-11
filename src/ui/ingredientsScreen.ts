import type { createFridge } from "../fridge";
import { QUICK_ADD, suggest } from "../ingredients/vocabulary";
import { normalizeIngredient } from "../ingredients/normalize";
import { h } from "./dom";

export interface IngredientsDeps {
  fridge: ReturnType<typeof createFridge>;
  vocab: string[];
  onFind: () => void;
}

export function renderIngredientsScreen(root: HTMLElement, { fridge, vocab, onFind }: IngredientsDeps): void {
  const input = h("input", {
    type: "search",
    placeholder: "Add a food, e.g. eggs",
    "aria-label": "Add an ingredient",
    maxlength: "40",
    autocomplete: "off",
    autocapitalize: "none",
    enterkeyhint: "done",
  });
  const suggestions = h("ul", { class: "suggestions" });
  const chips = h("div", { class: "chips" });
  const quickAdd = h("div", { class: "quick-add" });
  const find = h("button", { class: "find", type: "button", onclick: () => onFind() }, "Find recipes");

  function add(name: string): void {
    fridge.add(name);
    input.value = "";
    refresh();
  }

  function refresh(): void {
    const items = fridge.list();

    chips.replaceChildren(
      ...items.map((name) =>
        h(
          "span",
          { class: "chip" },
          name,
          h("button", { class: "chip-remove", type: "button", "aria-label": `Remove ${name}`, onclick: () => { fridge.remove(name); refresh(); } }, "✕"),
        ),
      ),
    );

    const have = new Set(items.map(normalizeIngredient));
    quickAdd.replaceChildren(
      ...QUICK_ADD.filter((q) => !have.has(normalizeIngredient(q))).map((q) =>
        h("button", { class: "chip quick", type: "button", onclick: () => add(q) }, q),
      ),
    );

    suggestions.replaceChildren(
      ...suggest(vocab, input.value).map((s) =>
        h("li", {}, h("button", { type: "button", onclick: () => add(s) }, s)),
      ),
    );

    find.disabled = items.length === 0;
  }

  input.addEventListener("input", refresh);

  const form = h(
    "form",
    {
      class: "add-form",
      onsubmit: (e) => {
        e.preventDefault();
        add(input.value);
      },
    },
    input,
  );

  root.replaceChildren(
    h(
      "main",
      { class: "screen ingredients" },
      h("h1", {}, "What's in your fridge?"),
      h("p", { class: "hint" }, "Salt, oil and water are assumed. No need to add them."),
      form,
      suggestions,
      chips,
      h("h2", {}, "Quick add"),
      quickAdd,
    ),
    h("div", { class: "bottom-bar" }, find),
  );
  refresh();
}
