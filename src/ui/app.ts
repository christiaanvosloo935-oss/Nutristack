import { fetchAiRecipes } from "../ai/client";
import { createFridge } from "../fridge";
import { buildVocabulary } from "../ingredients/vocabulary";
import { LibraryUnavailableError, loadLibrary } from "../library";
import { createIdbCache } from "../library/cache";
import { fetchAllMeals } from "../library/mealdb";
import type { EffortLevel } from "../effort";
import type { Recipe } from "../types";
import { claimRoot, h } from "./dom";
import { matchOne } from "../matcher";
import { renderDetailScreen } from "./detailScreen";
import { renderIngredientsScreen, type IngredientsScreen } from "./ingredientsScreen";
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

  let home: IngredientsScreen | null = null;
  let lastLevel: EffortLevel | undefined;

  const showHome = () => {
    home = renderIngredientsScreen(root, { fridge, vocab, onFind: () => (window.location.hash = "#/results") });
  };

  const watchLibrary = () =>
    library
      .then((result) => {
        vocab = buildVocabulary(result.recipes);
        home?.setVocab(vocab);
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
    const isCurrent = claimRoot(root);
    root.replaceChildren(h("main", { class: "screen" }, h("p", { class: "hint" }, "Loading recipes…")));
    library
      .then(({ recipes, stale }) => {
        if (!isCurrent()) return;
        renderResultsScreen(root, {
          fridge: fridge.list(),
          recipes,
          stale,
          fetchAi: (ingredients) => fetchAiRecipes(ingredients),
          onOpen: (id) => (window.location.hash = `#/recipe/${id}`),
          initialLevel: lastLevel,
          onLevelChange: (level) => (lastLevel = level),
        });
      })
      .catch((error: unknown) => {
        if (!(error instanceof LibraryUnavailableError)) console.error(error);
        if (isCurrent()) showError();
      });
  };

  const showRecipe = ([id]: string[]) => {
    const isCurrent = claimRoot(root);
    library
      .then(({ recipes }) => {
        if (!isCurrent()) return;
        const recipe = recipes.find((r) => r.id === id);
        if (!recipe) {
          window.location.hash = "#/results";
          return;
        }
        renderDetailScreen(root, matchOne(fridge.list(), recipe), () => window.history.back());
        window.scrollTo(0, 0);
      })
      .catch(() => {
        if (isCurrent()) showError();
      });
  };

  startRouter({ "": showHome, results: showResults, recipe: showRecipe });
}
