import { fetchAiRecipes } from "../ai/client";
import { createFridge } from "../fridge";
import { buildVocabulary } from "../ingredients/vocabulary";
import { LibraryUnavailableError, loadLibrary } from "../library";
import { createIdbCache } from "../library/cache";
import { fetchAllMeals } from "../library/mealdb";
import type { Recipe } from "../types";
import { h } from "./dom";
import { renderIngredientsScreen } from "./ingredientsScreen";
import { renderResultsScreen } from "./resultsScreen";
import { startRouter } from "./router";

interface Library {
  recipes: Recipe[];
  stale: boolean;
}

export function startApp(root: HTMLElement): void {
  const fridge = createFridge(window.localStorage);
  const startLoad = () => loadLibrary({ cache: createIdbCache(), fetchAll: () => fetchAllMeals(), now: Date.now });
  let library: Promise<Library> = startLoad();
  let vocab: string[] = [];

  const onHome = () => window.location.hash === "" || window.location.hash === "#/";

  const showHome = () => {
    renderIngredientsScreen(root, { fridge, vocab, onFind: () => (window.location.hash = "#/results") });
  };

  const watchLibrary = () =>
    library
      .then((result) => {
        vocab = buildVocabulary(result.recipes);
        if (onHome()) showHome();
      })
      .catch(() => undefined);
  void watchLibrary();

  const showError = () => {
    root.replaceChildren(
      h(
        "main",
        { class: "screen" },
        h("a", { class: "back", href: "#/" }, "← Edit ingredients"),
        h("h1", {}, "Can't load recipes"),
        h("p", { class: "hint" }, "Nutristack needs an internet connection once to download the recipes. After that it works offline."),
        h(
          "button",
          {
            class: "primary",
            type: "button",
            onclick: () => {
              library = startLoad();
              void watchLibrary();
              showResults();
            },
          },
          "Try again",
        ),
      ),
    );
  };

  const showResults = () => {
    root.replaceChildren(h("main", { class: "screen" }, h("p", { class: "hint" }, "Loading recipes…")));
    library
      .then(({ recipes, stale }) =>
        renderResultsScreen(root, {
          fridge: fridge.list(),
          recipes,
          stale,
          fetchAi: (ingredients) => fetchAiRecipes(ingredients),
          onOpen: (id) => (window.location.hash = `#/recipe/${id}`),
        }),
      )
      .catch((error: unknown) => {
        if (!(error instanceof LibraryUnavailableError)) console.error(error);
        showError();
      });
  };

  startRouter({ "": showHome, results: showResults });
}
