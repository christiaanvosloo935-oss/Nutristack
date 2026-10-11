# Nutristack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A free, phone-first PWA where the user lists fridge foods and gets matching real recipes (with photos) plus a separate AI-suggested section.

**Architecture:** Static Vite + TypeScript PWA (plain DOM, hash router). The full TheMealDB library is downloaded once (free key, `search.php?f=a..z`), cached in IndexedDB, and matched on-device. One Cloudflare Pages Function proxies Gemini's free tier so the key stays secret. Pure logic lives in small modules with Vitest tests.

**Tech Stack:** Vite, TypeScript, Vitest (+ jsdom, fake-indexeddb), Cloudflare Pages + Pages Functions (wrangler for local dev), Gemini REST API, Playwright for screenshots.

**Spec:** `docs/superpowers/specs/2026-10-11-nutristack-design.md`

## Global Constraints

- Everything must cost $0 and never be able to bill: TheMealDB test key `1`, Gemini free tier, Cloudflare Pages free plan. No card on file, no paid APIs.
- Phone first: design at 390x844; tappable targets >= 44px; primary button sticky at the bottom.
- Staples (salt, pepper, water, oil, sugar, flour, butter, etc.) are ignored when matching but listed in each recipe as "You'll also need".
- Real recipes show only when ready to cook or missing at most 2 non-staple ingredients (and at least 1 ingredient matched).
- AI recipes live in a separate section labelled "AI suggestion, not kitchen-tested"; they load only when the user taps a button; returns 3 recipes; failures never affect real recipes.
- No accounts, no quantities, no expiry dates. Fridge list persists in `localStorage`.
- Every git commit message ends with these two lines (after a blank line):
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01NBKf9rCD4rUQ8YLDit8gW7`
- Develop on branch `claude/serene-euler-apa3ci`; push there only; do not open a PR.

## Review Focus

- TheMealDB meals have `strIngredient1..20` that are `null` or `""` and a `meals: null` response for letters with no meals: must not produce blank ingredients or crash. (Task 5)
- Fridge entries differing by case/whitespace/plural ("Eggs ", "egg") or added twice: must be one entry and still match. (Tasks 2, 7)
- "Find recipes" with an empty fridge: show a prompt to add food, never every recipe. (Task 11)
- First launch offline with no cache, and library fetch partially failing: clear retry message, no half-saved cache. (Tasks 5, 6, 11)
- AI endpoint given oversized/non-string input, or Gemini returning malformed JSON / 429: friendly error, no crash, no key leak. (Tasks 8, 9)

---

## File Structure

```
package.json, tsconfig.json, vite.config.ts, index.html, README.md
public/manifest.webmanifest, public/sw.js, public/icon-192.png, public/icon-512.png
src/types.ts                      shared types
src/ingredients/normalize.ts      normalizeIngredient
src/ingredients/staples.ts        isStaple
src/ingredients/vocabulary.ts     QUICK_ADD, buildVocabulary, suggest
src/matcher.ts                    matchRecipes
src/library/mealdb.ts             parseMeal, fetchAllMeals
src/library/cache.ts              LibraryCache, createIdbCache
src/library/index.ts              loadLibrary
src/fridge.ts                     createFridge
src/ai/client.ts                  fetchAiRecipes
shared/aiRecipes.ts               validateRequest, buildPrompt, parseAiResponse, callGemini, errors
functions/api/ai-recipes.ts       Pages Function (onRequestPost)
src/ui/app.ts, router.ts          shell + hash router
src/ui/ingredientsScreen.ts, resultsScreen.ts, detailScreen.ts, styles.css
src/main.ts                       bootstrap
tests/**                          one test file per module
```

### Task 1: Scaffold and shared types

**Files:** Create `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/types.ts`, `src/main.ts` (empty bootstrap), `tests/smoke.test.ts`

**Interfaces:**
- Produces (`src/types.ts`):
  - `interface RecipeIngredient { name: string; measure: string }`
  - `interface Recipe { id: string; name: string; category: string; area: string; thumb: string; ingredients: RecipeIngredient[]; instructions: string; source?: string }`
  - `interface Match { recipe: Recipe; have: string[]; missing: string[]; staples: string[] }`
  - `interface AiRecipe { title: string; description: string; ingredients: string[]; steps: string[]; basedOn?: string }`

- [ ] **Step 1:** Create a Vite vanilla-ts project in the repo root with devDependencies `vite`, `typescript`, `vitest`, `jsdom`, `fake-indexeddb`, `wrangler`, `@cloudflare/workers-types`, `@playwright/test`. Scripts: `dev`, `build`, `test` (`vitest run`), `typecheck` (`tsc --noEmit`). Vitest environment `jsdom`. `.gitignore` ignores `node_modules`, `dist`, `.wrangler`, `.dev.vars`.
- [ ] **Step 2:** Write `tests/smoke.test.ts` asserting `1 + 1 === 2`; run `npm test` — Expected: PASS.
- [ ] **Step 3:** Add `src/types.ts` exactly as in Interfaces. Run `npm run typecheck` — Expected: no errors.
- [ ] **Step 4:** Commit `chore: scaffold Vite + Vitest project and shared types`.

### Task 2: Ingredient normalisation and staples

**Files:** Create `src/ingredients/normalize.ts`, `src/ingredients/staples.ts`; Test `tests/ingredients.test.ts`

**Interfaces:**
- Produces: `normalizeIngredient(raw: string): string`; `isStaple(name: string): boolean`

- [ ] **Step 1: Write failing tests** in `tests/ingredients.test.ts`:
  - `normalizeIngredient("  Eggs ")` -> `"egg"`; `"Tomatoes"` -> `"tomato"`; `"Cherries"` -> `"cherry"`; `"Chickpeas"` -> `"chickpea"`; `"Hummus"` and `"Asparagus"` unchanged (lowercased); `"Scallions"` and `"Spring Onions"` -> `"spring onion"`; `"Minced   Beef"` -> `"minced beef"`; `""` -> `""`.
  - `isStaple`: true for `"Salt"`, `"Sea Salt"`, `"Olive Oil"`, `"Sesame Oil"`, `"Water"`, `"Boiling Water"`, `"Black Pepper"`, `"Sugar"`, `"Plain Flour"`, `"Butter"`; false for `"Peanut Butter"`, `"Chicken"`, `"Tomato"`.
- [ ] **Step 2:** Run `npx vitest run tests/ingredients.test.ts` — Expected: FAIL (modules missing).
- [ ] **Step 3: Implement `normalizeIngredient`**: lowercase, trim, strip punctuation, collapse spaces, singularise each word (`ies`->`y`, `oes`->`o`, trailing `s` removed unless word ends `ss` or `us`), then apply a small synonym map (`scallion`->`spring onion`, `coriander`/`cilantro` -> `coriander`, `aubergine`->`eggplant`, `courgette`->`zucchini`; extend sparingly). **Implement `isStaple`**: normalised name is in an exact set (`salt, pepper, black pepper, white pepper, water, oil, olive oil, vegetable oil, sunflower oil, cooking oil, sugar, flour, plain flour, butter`) OR its last word is `salt`, `oil` or `water`.
- [ ] **Step 4:** Run the test file — Expected: PASS.
- [ ] **Step 5:** Commit `feat: ingredient normalisation and staples`.

### Task 3: Vocabulary and autocomplete

**Files:** Create `src/ingredients/vocabulary.ts`; Test `tests/vocabulary.test.ts`

**Interfaces:**
- Consumes: `normalizeIngredient`, `isStaple` (Task 2), `Recipe` (Task 1)
- Produces: `QUICK_ADD: string[]` (`eggs, rice, pasta, onion, tomato, cheese, potato, chicken, garlic, milk, bread, carrot`); `buildVocabulary(recipes: Recipe[]): string[]` (unique normalised non-staple ingredient names, sorted); `suggest(vocab: string[], query: string, limit = 8): string[]`

- [ ] **Step 1: Failing tests:** `buildVocabulary` over two fixture recipes dedupes `"Eggs"`/`"egg"`, excludes `"Salt"`, is sorted. `suggest(vocab, "chi")` returns prefix matches before substring matches (`chicken`, `chickpea` before `stir-fried chili`), respects `limit`, returns `[]` for `""` and for whitespace-only queries.
- [ ] **Step 2:** Run — Expected: FAIL. **Step 3:** Implement. **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat: ingredient vocabulary and autocomplete`.

### Task 4: Matcher

**Files:** Create `src/matcher.ts`; Test `tests/matcher.test.ts`, fixture `tests/fixtures/recipes.ts` (5-6 small hand-made recipes)

**Interfaces:**
- Consumes: `normalizeIngredient`, `isStaple`, `Recipe`, `Match`
- Produces: `matchRecipes(fridge: string[], recipes: Recipe[]): Match[]`

Matching rule: a recipe ingredient is "had" if some fridge item, normalised, equals it or its words are all contained in the recipe ingredient's words (fridge `chicken` matches `chicken breast`; fridge `chicken breast` does not match `chicken`). Staple recipe ingredients go to `staples`, never to `have`/`missing`. Keep only matches with `have.length >= 1` and `missing.length <= 2`; sort by fewest missing, then most `have`, then name.

- [ ] **Step 1: Failing tests:** (a) fridge covering a whole recipe -> `missing: []`, ranked first; (b) recipe missing 2 is included, missing 3 is excluded; (c) staples-only overlap (fridge `salt`, recipe of salt+water+3 unknowns) yields no match; (d) `"Eggs "` and `"egg"` in fridge behave identically; (e) fridge `chicken` matches recipe ingredient `Chicken Breast`; (f) empty fridge returns `[]`; (g) ordering tie-break by `have` count then name.
- [ ] **Step 2:** Run — Expected: FAIL. **Step 3:** Implement. **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat: recipe matcher`.

### Task 5: TheMealDB parsing and fetching

**Files:** Create `src/library/mealdb.ts`; Test `tests/mealdb.test.ts`

**Interfaces:**
- Produces: `parseMeal(raw: Record<string, string | null>): Recipe`; `fetchAllMeals(fetchFn?: typeof fetch): Promise<Recipe[]>`

URL pattern: `https://www.themealdb.com/api/json/v1/1/search.php?f=<letter>` for `a`..`z`.

- [ ] **Step 1: Failing tests:** `parseMeal` on a raw meal with `strIngredient1: "Chicken"`, `strMeasure1: "200g"`, `strIngredient2: ""`, `strIngredient3: null`, `strIngredient4: " Salt "` -> ingredients `[{Chicken,200g},{Salt,""}]` (blank/null skipped, names trimmed), maps `idMeal`, `strMeal`, `strCategory`, `strArea`, `strMealThumb`, `strInstructions`, `strSource` (empty -> undefined). `fetchAllMeals` with a fake `fetchFn`: requests 26 URLs, handles `{meals: null}` for most letters, dedupes by id; if any one letter returns non-OK it rejects (no partial result).
- [ ] **Step 2:** Run — Expected: FAIL. **Step 3:** Implement (parallel `Promise.all`). **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat: TheMealDB parsing and full-library fetch`.

### Task 6: Library cache and loader

**Files:** Create `src/library/cache.ts`, `src/library/index.ts`; Test `tests/library.test.ts`

**Interfaces:**
- Produces: `interface LibraryCache { get(): Promise<{ recipes: Recipe[]; savedAt: number } | null>; put(recipes: Recipe[], savedAt: number): Promise<void> }`; `createIdbCache(): LibraryCache` (IndexedDB db `nutristack`, store `library`); `class LibraryUnavailableError extends Error`; `loadLibrary(deps: { cache: LibraryCache; fetchAll: () => Promise<Recipe[]>; now: () => number }): Promise<{ recipes: Recipe[]; stale: boolean }>`
- Consumes: `fetchAllMeals`, `Recipe`

Behaviour: fresh cache (< 7 days) returned without fetching; missing/old cache triggers fetch and `put`; fetch failure with a cache returns it with `stale: true`; fetch failure with no cache throws `LibraryUnavailableError` and writes nothing.

- [ ] **Step 1: Failing tests** for the four behaviours using an in-memory `LibraryCache`, plus one test that `createIdbCache` round-trips with `fake-indexeddb/auto`.
- [ ] **Step 2:** Run — Expected: FAIL. **Step 3:** Implement. **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat: IndexedDB library cache and weekly refresh`.

### Task 7: Fridge store

**Files:** Create `src/fridge.ts`; Test `tests/fridge.test.ts`

**Interfaces:**
- Consumes: `normalizeIngredient`
- Produces: `createFridge(storage: Pick<Storage, "getItem" | "setItem">): { list(): string[]; add(name: string): boolean; remove(name: string): void }` (key `nutristack.fridge`)

- [ ] **Step 1: Failing tests:** `add("Eggs ")` stores `"Eggs"` and returns true; `add("egg")` afterwards returns false (duplicate by normalised name); blank/whitespace add returns false; `remove("eggs")` removes it; state persists across two `createFridge` calls on the same storage; corrupt JSON in storage -> empty list; a storage whose `setItem` throws does not throw (list still works in memory).
- [ ] **Step 2:** Run — Expected: FAIL. **Step 3:** Implement. **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat: fridge store`.

### Task 8: AI recipe logic and Pages Function

**Files:** Create `shared/aiRecipes.ts`, `functions/api/ai-recipes.ts`, `.dev.vars.example`; Test `tests/aiRecipes.test.ts`

**Interfaces:**
- Consumes: `AiRecipe`
- Produces (`shared/aiRecipes.ts`): `validateRequest(body: unknown): { ok: true; ingredients: string[] } | { ok: false; error: string }` (array of 1-15 strings, each 1-40 chars after trim, control characters stripped, else `ok:false`); `buildPrompt(ingredients: string[]): string` (instructs: use only these ingredients plus salt/pepper/oil/water/sugar/flour/butter; student-friendly, cheap, simple; 3 recipes; either adapt a known dish and name it in `basedOn` or invent); `parseAiResponse(text: string): AiRecipe[]` (throws `AiParseError`; max 3; each needs non-empty title and >= 1 step); `callGemini(opts: { apiKey: string; model: string; ingredients: string[]; fetchFn?: typeof fetch }): Promise<AiRecipe[]>` (REST `v1beta/models/{model}:generateContent`, header `x-goog-api-key`, `responseMimeType: "application/json"` with a response schema; HTTP 429 -> `AiQuotaError`, any other failure -> `AiUnavailableError`); classes `AiQuotaError`, `AiUnavailableError`, `AiParseError`.
- Produces (`functions/api/ai-recipes.ts`): `onRequestPost` reading `env.GEMINI_API_KEY` and optional `env.GEMINI_MODEL`; responds `200 {recipes}`, `400 {error:"invalid"}`, `429 {error:"quota"}`, `502 {error:"unavailable"}`; never echoes the key or upstream error text.

- [ ] **Step 1: Failing tests:** validation accepts 3 strings; rejects non-array, 16 items, a 41-char string, a number inside the array, empty array; strips control characters. `parseAiResponse` accepts valid JSON, truncates to 3, rejects malformed JSON, rejects a recipe with no steps. `callGemini` with fake `fetchFn`: 429 -> `AiQuotaError`; 500 -> `AiUnavailableError`; valid candidate text -> recipes; request carries the key only in the header, not the URL.
- [ ] **Step 2:** Run — Expected: FAIL. **Step 3:** Implement. Default `GEMINI_MODEL` to `gemini-2.0-flash`; **before relying on it, check Google's current docs for a free-tier model and its free limits/data-use terms, and note the result in the README.**
- [ ] **Step 4:** Run `npm test` and `npm run typecheck` — Expected: PASS.
- [ ] **Step 5:** Commit `feat: Gemini AI recipe function with validation`.

### Task 9: AI client

**Files:** Create `src/ai/client.ts`; Test `tests/aiClient.test.ts`

**Interfaces:**
- Consumes: `AiRecipe`, `AiQuotaError`, `AiUnavailableError` (Task 8)
- Produces: `fetchAiRecipes(ingredients: string[], fetchFn?: typeof fetch): Promise<AiRecipe[]>` — POSTs `{ingredients}` to `/api/ai-recipes`; 429 -> `AiQuotaError`; other non-OK or network error -> `AiUnavailableError`.

- [ ] **Step 1: Failing tests** for success, 429, 502 and a rejected fetch. **Step 2:** Run — Expected: FAIL. **Step 3:** Implement. **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat: AI client`.

### Task 10: App shell, router, and Screen 1 (ingredients)

**Files:** Create `src/ui/router.ts`, `src/ui/app.ts`, `src/ui/ingredientsScreen.ts`, `src/ui/styles.css`; Modify `src/main.ts`, `index.html`; Test `tests/ingredientsScreen.test.ts` (jsdom)

**Interfaces:**
- Consumes: `createFridge`, `suggest`, `buildVocabulary`, `QUICK_ADD`, `loadLibrary`
- Produces: `startRouter(routes: Record<string, (params: string[]) => void>): void` (hash routes `#/`, `#/results`, `#/recipe/<id>`); `renderIngredientsScreen(root: HTMLElement, deps: { fridge: ReturnType<typeof createFridge>; vocab: string[]; onFind: () => void }): void`

Screen: search input with autocomplete list, removable chips (each with a ✕ button >= 44px), a quick-add chip row, sticky "Find recipes" button. Library loads in the background on startup (Task 11 handles its failure UI).

- [ ] **Step 1: Failing jsdom tests:** typing `chi` shows suggestions; tapping a suggestion adds a chip and clears input; tapping ✕ removes the chip; tapping a quick-add chip adds it; adding a duplicate does not add a second chip; pressing Enter adds free text; "Find recipes" calls `onFind`.
- [ ] **Step 2:** Run — Expected: FAIL. **Step 3:** Implement with mobile-first CSS (system font, single column, bottom-sticky button, safe-area padding). **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat: app shell and ingredients screen`.

### Task 11: Screen 2 (results) with AI section

**Files:** Create `src/ui/resultsScreen.ts`; Modify `src/ui/app.ts`, `src/ui/styles.css`; Test `tests/resultsScreen.test.ts` (jsdom)

**Interfaces:**
- Consumes: `matchRecipes`, `fetchAiRecipes`, `Match`, `Recipe`, `LibraryUnavailableError`
- Produces: `renderResultsScreen(root: HTMLElement, deps: { fridge: string[]; recipes: Recipe[]; stale: boolean; fetchAi: (ing: string[]) => Promise<AiRecipe[]>; onOpen: (id: string) => void }): void`

Screen: two-column grid of cards (`<img loading="lazy">` thumbnail, name, badge `"<have>/<have+missing> ingredients"`, green for ready, amber with `Need: x, y` for missing); filter chips All / Ready to cook / Missing 1-2 plus a category chip row; tap card -> `onOpen(id)`. Empty fridge -> message "Add some food first" with a back link, no cards. No matches -> message plus a highlight on the AI button. Below the grid: "Suggest AI recipes" button; on tap, shows 3 expandable cards labelled "AI suggestion, not kitchen-tested" and a "Give me 3 more" button; `AiQuotaError` -> "Free AI limit reached for today, try again tomorrow"; `AiUnavailableError` -> "AI is unavailable right now"; real recipes stay visible in all cases. `app.ts` shows a retry screen on `LibraryUnavailableError` ("Needs an internet connection once to download recipes") and a small "showing saved recipes" note when `stale`.

- [ ] **Step 1: Failing jsdom tests:** ready-to-cook filter hides recipes with missing items; category filter works; badge text and `Need:` text correct; empty fridge shows prompt and zero cards; AI button not auto-fired (fake `fetchAi` not called on render); tapping it renders 3 labelled cards; quota error shows the friendly message and leaves real cards in place.
- [ ] **Step 2:** Run — Expected: FAIL. **Step 3:** Implement. **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat: results screen with AI suggestions`.

### Task 12: Screen 3 (recipe detail)

**Files:** Create `src/ui/detailScreen.ts`; Modify `src/ui/app.ts`; Test `tests/detailScreen.test.ts` (jsdom)

**Interfaces:**
- Consumes: `Match`, `Recipe`
- Produces: `renderDetailScreen(root: HTMLElement, match: Match, onBack: () => void): void`

Shows large photo, name, three lists ("You have", "You need to get", "You'll also need" for staples, each with measures), numbered steps (split `instructions` on line breaks, dropping empty lines), source link (`rel="noopener"`) when present, a back button >= 44px.

- [ ] **Step 1: Failing tests:** lists render with measures; staples appear only under "You'll also need"; blank instruction lines produce no empty steps; no source link when `source` is undefined; back button calls `onBack`.
- [ ] **Step 2:** Run — Expected: FAIL. **Step 3:** Implement. **Step 4:** Run — Expected: PASS.
- [ ] **Step 5:** Commit `feat: recipe detail screen`.

### Task 13: PWA, deployment config, README, and end-to-end check

**Files:** Create `public/manifest.webmanifest`, `public/sw.js`, `public/icon-192.png`, `public/icon-512.png`, `README.md`, `playwright.config.ts`, `tests/e2e/phone.spec.ts`; Modify `index.html`, `src/main.ts`

- [ ] **Step 1:** Manifest (`name: Nutristack`, `display: standalone`, theme colour, both icons). Service worker: precache the app shell, cache-first for static assets and TheMealDB images, never cache `/api/*`. Register it in `main.ts` in production only.
- [ ] **Step 2:** README: what it is, `npm run dev` for the UI, `npx wrangler pages dev dist` with `.dev.vars` (`GEMINI_API_KEY=...`) for the AI function, how to deploy free on Cloudflare Pages (connect repo, build `npm run build`, output `dist`, secret `GEMINI_API_KEY`), the free-tier checks from Task 8 and the TheMealDB terms note (educational/shared use only; store launch needs its supporter key).
- [ ] **Step 3:** Playwright spec at 390x844 with TheMealDB and `/api/ai-recipes` mocked via `page.route`: add `egg`, `cheese`, `tomato`, tap Find recipes, assert at least one card with an image and a badge, open it, assert the "You'll also need" list, go back, tap Suggest AI recipes and assert 3 labelled cards. Save screenshots of the three screens to `docs/screenshots/`.
- [ ] **Step 4:** Run `npm test`, `npm run typecheck`, `npm run build`, then `npx playwright test` — Expected: all PASS; open the screenshots and confirm nothing overflows horizontally.
- [ ] **Step 5:** Commit `feat: PWA, deploy config, README and e2e test`, then `git push -u origin claude/serene-euler-apa3ci`.
