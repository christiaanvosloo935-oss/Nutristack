# Nutristack — Design

## Purpose
A free, phone-first web app for students and people living alone. The user lists the
foods in their fridge and gets as many recipes as possible that can be made from them.
The goal is learning to cook and getting by on a budget, so everything must cost $0 to
build, host and run, and nothing may ever be able to bill the owner.

Shared with friends via a link for now. No app-store release, but the design must not
block wrapping it later (hence a PWA).

## Decisions made with the owner
- Pantry staples (salt, pepper, water, oil, sugar, flour, butter, etc.) are assumed on
  hand: they are ignored when matching but shown in each recipe as "You'll also need".
- Real recipes come from a free database and show dish photos. AI recipes live in a
  separate, clearly labelled section.
- Phone first. Free only. No accounts, no quantities, no expiry dates (YAGNI).
- Real-recipe results: ready to cook, or missing at most 2 ingredients.

## Architecture
Static PWA (Vite + TypeScript, plain DOM or Preact — no heavy framework) hosted on
Cloudflare Pages free plan, plus one Pages Function that proxies the AI call.

```
Phone (PWA)
 ├─ Recipe library  <- TheMealDB free key, downloaded once (a..z), cached in IndexedDB
 ├─ Matcher         <- pure functions, runs on device, no network
 ├─ Fridge list     <- localStorage
 └─ AI section ---> /api/ai-recipes (Pages Function, holds Gemini key) ---> Gemini free tier
```

### Units
1. **library** — fetch `search.php?f=a..z` from TheMealDB (free test key), normalise to
   `{id, name, category, area, thumb, ingredients[], measures[], instructions, source}`,
   store in IndexedDB, refresh weekly. Falls back to the cache when offline.
2. **ingredients** — normalisation (lowercase, trim, singular/plural, small synonym map
   e.g. "scallion"="spring onion"), the staples list, autocomplete vocabulary built from
   the library's ingredient names plus a quick-add list of common student foods.
3. **matcher** — `match(fridge, recipes) -> {recipe, have[], missing[], staplesNeeded[]}`
   sorted by fewest missing, then most ingredients used. Keeps only missing <= 2.
4. **fridge store** — add/remove/list, persisted in localStorage.
5. **ai client + function** — function validates input (max ~15 ingredients, length
   caps), calls Gemini with a JSON schema, returns 3 recipes
   `{title, description, ingredients[], steps[], basedOn?}`; client renders them.
   Hard-capped by the free tier: on quota/error return a friendly "try again tomorrow".
6. **UI** — screen 1 ingredients (search + autocomplete, chips, quick-add row, sticky
   "Find recipes" button), screen 2 results (two-column photo cards with match badge,
   filter chips All / Ready to cook / Missing 1-2 plus category, AI section below),
   screen 3 recipe detail (photo, have/missing/staples, steps, source link).

## Data flow
Add ingredients -> saved locally -> "Find recipes" -> matcher over cached library ->
cards. AI section: tapped "Suggest AI recipes" (default, saves free quota) ->
function -> Gemini -> 3 cards with an illustration placeholder and an
"AI suggestion, not kitchen-tested" label.

## Error handling
- Library fetch fails and no cache: show retry, explain it needs a connection once.
- AI quota exhausted / function error: inline message, real recipes unaffected.
- No matches: say so and offer the AI section.

## Testing
Unit tests (Vitest) for ingredient normalisation, staples handling and matcher ranking
and the missing<=2 cutoff, using a small fixture library. Function input validation
tested. Manual check on a phone-sized viewport with Playwright screenshots.

## Cost safety
Only free plans with hard limits are used (TheMealDB test key, Gemini free tier,
Cloudflare Pages free). No card on file. If a limit is hit the feature pauses; nothing bills.

## Assumptions to verify during implementation
- TheMealDB free key is for development/educational use; sharing with friends fits, a
  public store launch would need its supporter key.
- Current Gemini free-tier limits and data-use terms (requests may be used to improve
  models; fridge lists are non-sensitive).
- Cloudflare Pages Functions free-plan request limits.

## Out of scope (for now)
Accounts, quantities, expiry tracking, meal planning, shopping lists, nutrition data,
app-store packaging, a second recipe database (Spoonacular) — can be added behind the
library unit's interface later.
