import { createFridge } from "../fridge";
import { buildVocabulary } from "../ingredients/vocabulary";
import { createIdbCache } from "../library/cache";
import { LibraryUnavailableError, loadLibrary } from "../library";
import { fetchAllMeals } from "../library/mealdb";
import type { Recipe } from "../types";
import { renderIngredientsScreen } from "./ingredientsScreen";
import { startRouter } from "./router";

export function startApp(root: HTMLElement): void {
  const fridge = createFridge(window.localStorage);
  const library = loadLibrary({ cache: createIdbCache(), fetchAll: () => fetchAllMeals(), now: Date.now });
  let recipes: Recipe[] = [];
  let vocab: string[] = [];

  const showHome = () => {
    renderIngredientsScreen(root, { fridge, vocab, onFind: () => (window.location.hash = "#/results") });
  };

  library
    .then((result) => {
      recipes = result.recipes;
      vocab = buildVocabulary(recipes);
      if (window.location.hash === "" || window.location.hash === "#/") showHome();
    })
    .catch((error: unknown) => {
      if (!(error instanceof LibraryUnavailableError)) console.error(error);
    });

  startRouter({ "": showHome });
}
