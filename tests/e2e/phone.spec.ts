import { expect, test, type Page } from "@playwright/test";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function meal(id: number, name: string, category: string, ingredients: string[], instructions = "Mix everything.\r\n\r\nCook until done.") {
  const raw: Record<string, string | null> = {
    idMeal: String(id),
    strMeal: name,
    strCategory: category,
    strArea: "Test",
    strMealThumb: `https://www.themealdb.com/images/media/meals/test-${id}.jpg`,
    strInstructions: instructions,
    strSource: "https://example.com/recipe",
  };
  for (let i = 1; i <= 20; i++) {
    raw[`strIngredient${i}`] = ingredients[i - 1] ?? (i % 2 ? "" : null);
    raw[`strMeasure${i}`] = ingredients[i - 1] ? "1 portion" : null;
  }
  return raw;
}

const meals = [
  meal(1, "Cheese Omelette", "Breakfast", ["Eggs", "Cheese", "Butter", "Salt"]),
  meal(2, "Tomato Pasta", "Pasta", ["Pasta", "Tomatoes", "Garlic", "Olive Oil"]),
  meal(3, "Chicken Rice", "Chicken", ["Chicken Breast", "Rice", "Onion", "Soy Sauce"]),
  meal(4, "Slow Tomato Bake", "Vegetarian", ["Tomatoes", "Cheese", "Garlic"], "Layer everything. Bake for 2 hours."),
];

const aiRecipes = [1, 2, 3].map((n) => ({
  title: `AI Dish ${n}`,
  description: "Made from your fridge.",
  ingredients: ["egg", "cheese"],
  steps: ["Cook it."],
}));

async function mockNetwork(page: Page, { libraryFails = false, libraryDelayMs = 0 } = {}) {
  await page.route("https://www.themealdb.com/api/json/v1/1/search.php?f=*", async (route) => {
    if (libraryFails) return route.abort();
    if (libraryDelayMs) await new Promise((r) => setTimeout(r, libraryDelayMs));
    const letter = new URL(route.request().url()).searchParams.get("f");
    return route.fulfill({ json: { meals: letter === "a" ? meals : null } });
  });
  await page.route("https://www.themealdb.com/images/**", (route) => route.fulfill({ body: PNG, contentType: "image/png" }));
  await page.route("**/api/ai-recipes", (route) => route.fulfill({ json: { recipes: aiRecipes } }));
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("add food, find recipes, open one, and get AI ideas", async ({ page }) => {
  await mockNetwork(page);
  await page.goto("/");

  for (const food of ["eggs", "cheese", "tomato"]) {
    await page.locator(".quick-add button", { hasText: new RegExp(`^${food}$`) }).click();
  }
  await expect(page.locator(".chips .chip")).toHaveCount(3);
  await page.screenshot({ path: "docs/screenshots/1-ingredients.png" });
  await noHorizontalScroll(page);

  await page.locator("button.find").click();
  const firstCard = page.locator(".grid .card").first();
  await expect(firstCard).toBeVisible();
  await expect(firstCard.locator("img")).toHaveAttribute("src", /test-1\.jpg/);
  await expect(firstCard.locator(".badge")).toHaveText("2/2 ingredients");
  await expect(firstCard.locator(".time")).toContainText("min");
  await expect(page.locator(".level-title").first()).toContainText("Quick");
  await expect(page.locator(".level-title").last()).toContainText("Long");
  await page.screenshot({ path: "docs/screenshots/2-results.png", fullPage: true });
  await noHorizontalScroll(page);

  await firstCard.click();
  await expect(page.getByRole("heading", { name: "Cheese Omelette" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "You'll also need" })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/3-detail.png", fullPage: true });
  await noHorizontalScroll(page);

  await page.locator("button.back").click();
  await expect(page.locator(".grid .card").first()).toBeVisible();
  await page.locator(".ai-suggest").click();
  await expect(page.locator(".ai-card")).toHaveCount(3);
  await expect(page.locator(".ai-label").first()).toHaveText("AI suggestion, not kitchen-tested");
});

test("the fridge list survives a reload", async ({ page }) => {
  await mockNetwork(page);
  await page.goto("/");
  await page.locator(".quick-add button", { hasText: /^rice$/ }).click();
  await page.reload();
  await expect(page.locator(".chips .chip")).toHaveCount(1);
});

test("offline on first launch shows a clear retry screen", async ({ page }) => {
  await mockNetwork(page, { libraryFails: true });
  await page.goto("/");
  await page.locator(".quick-add button", { hasText: /^rice$/ }).click();
  await page.locator("button.find").click();
  await expect(page.getByRole("heading", { name: "Can't load recipes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("typing is not wiped when the library finishes loading", async ({ page }) => {
  await mockNetwork(page, { libraryDelayMs: 1500 });
  await page.goto("/");
  await page.getByLabel("Add an ingredient").fill("che");
  await expect(page.locator(".suggestions button").first()).toBeVisible({ timeout: 6000 });
  await expect(page.getByLabel("Add an ingredient")).toHaveValue("che");
  await expect(page.locator(".suggestions button").first()).toHaveText("cheese");
});

test("a slow library does not cover the home screen after the user went back", async ({ page }) => {
  await mockNetwork(page, { libraryDelayMs: 1500 });
  await page.goto("/");
  await page.locator(".quick-add button", { hasText: /^eggs$/ }).click();
  await page.locator("button.find").click();
  await expect(page.getByText("Loading recipes")).toBeVisible();
  await page.goBack();
  await page.waitForTimeout(2500);
  await expect(page.getByRole("heading", { name: "What's in your fridge?" })).toBeVisible();
  await expect(page.locator(".grid .card")).toHaveCount(0);
});

test.describe("offline shell", () => {
  test.use({ serviceWorkers: "allow" });

  test("the app opens offline after one visit", async ({ page, context }) => {
    await mockNetwork(page);
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "What's in your fridge?" })).toBeVisible();
  });
});
