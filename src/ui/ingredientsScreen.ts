import type { createFridge } from "../fridge";
import { QUICK_ADD, QUICK_ADD_EMOJI, suggest } from "../ingredients/vocabulary";
import { normalizeIngredient } from "../ingredients/normalize";
import { claimRoot, h } from "./dom";

export interface IngredientsDeps {
  fridge: ReturnType<typeof createFridge>;
  vocab: string[];
  onFind: () => void;
}

const TONES = ["cream", "sage", "sand", "taupe"];

// Static markup (no user data): a soft hills-and-sun picture, drawn inline so it works offline.
const WIDGET_ART = `<svg class="widget-art" viewBox="0 0 200 110" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <circle class="sun" cx="165" cy="26" r="11"/>
  <path class="hill hill-1" d="M0 62 C30 38 62 40 95 58 S150 44 200 56 V110 H0Z"/>
  <path class="hill hill-2" d="M0 78 C40 54 80 62 120 74 S180 62 200 70 V110 H0Z"/>
  <path class="hill hill-3" d="M0 94 C50 80 90 84 130 91 S180 88 200 92 V110 H0Z"/>
</svg>`;

function widget(): HTMLElement {
  const section = h("section", { class: "widget" }, h("p", { class: "widget-text" }, "Good meals start", h("br"), "with what you have"));
  section.insertAdjacentHTML("beforeend", WIDGET_ART);
  return section;
}

export interface IngredientsScreen {
  /** Swap in the autocomplete vocabulary without rebuilding the screen (keeps typed text and focus). */
  setVocab(next: string[]): void;
}

export function renderIngredientsScreen(root: HTMLElement, { fridge, vocab: initialVocab, onFind }: IngredientsDeps): IngredientsScreen {
  const isCurrent = claimRoot(root);
  let vocab = initialVocab;
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
      ...QUICK_ADD.map((q, i) => ({ q, tone: TONES[(i + Math.floor(i / 4)) % TONES.length] }))
        .filter(({ q }) => !have.has(normalizeIngredient(q)))
        .map(({ q, tone }) =>
          h(
            "button",
            { class: `tile ${tone}`, type: "button", onclick: () => add(q) },
            h("span", { class: "tile-icon", "data-emoji": QUICK_ADD_EMOJI[q] ?? "🍽️", "aria-hidden": "true" }),
            h("span", { class: "tile-label" }, q),
          ),
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
      widget(),
      h("h1", {}, "What's in your fridge?"),
      h("p", { class: "hint" }, "Salt, pepper, oil, water, sugar, flour and butter are assumed. No need to add them."),
      form,
      suggestions,
      chips,
      h("h2", {}, "Quick add"),
      quickAdd,
    ),
    h("div", { class: "bottom-bar" }, find),
  );
  refresh();

  return {
    setVocab(next) {
      if (!isCurrent()) return;
      vocab = next;
      refresh();
    },
  };
}
