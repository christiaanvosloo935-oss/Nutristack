# Nutristack

Add what's in your fridge, get recipes you can cook. Built for students and people living on their own: free to run, phone-first, installable like an app.

- **Real recipes with photos** from [TheMealDB](https://www.themealdb.com). The whole library is downloaded once (26 small requests), cached on the phone, and matched on-device, so there are no search limits.
- **Match badges**: "ready to cook" or "missing 1-2". Salt, oil, water and similar staples are assumed and listed as "You'll also need".
- **AI recipe ideas** in a separate, clearly labelled section (Gemini free tier), only when you tap the button.
- No accounts. Your fridge list is stored on your phone.

Screenshots (390x844): `docs/screenshots/`.

## Develop

```bash
npm install
npm run dev          # UI only; the AI button needs the function below
npm test             # unit tests (Vitest)
npm run typecheck
```

### Run with the AI function locally

```bash
cp .dev.vars.example .dev.vars     # then put your free Gemini key in it
npm run build
npx wrangler pages dev dist
```

Get a free key at <https://aistudio.google.com/apikey> in a new project with no billing account (see the deploy steps).

### End-to-end test (phone-sized browser, network mocked)

```bash
npx playwright test
# if Playwright can't find its browser: CHROMIUM_PATH=/path/to/chromium npx playwright test
```

## Deploy for free (Cloudflare Pages)

1. Push this repo to GitHub, then in Cloudflare: Workers & Pages -> Create -> Pages -> connect the repo.
2. Build command `npm run build`, output directory `dist`.
3. **Create the Gemini key safely:** at <https://aistudio.google.com/apikey> create the key in a **new project that has no billing account attached**. Check that AI Studio shows the project on the **Free tier**. A key from a Google Cloud project with billing turned on is charged at paid rates, and nothing in this app can stop that.
4. Settings -> Environment variables -> add secret `GEMINI_API_KEY` (optional: `GEMINI_MODEL`, default `gemini-2.5-flash`).
5. You get a free `*.pages.dev` address. Open it on a phone and use "Add to Home Screen".

Everything here uses free plans with hard limits and no card on file. If a limit is hit the feature pauses (the AI section says "try again tomorrow"). This holds as long as the Gemini key comes from a project without billing (step 3).

## Things to check yourself (limits change)

- **Gemini free tier**: Google doesn't publish a fixed table; limits are shown in AI Studio for your project (third-party guides suggest roughly 10 requests/minute and 250/day for Flash models). Free-tier requests may be used by Google to improve its products. Fridge lists aren't sensitive, but don't type anything private. Confirm the model in `GEMINI_MODEL` is still on the free tier.
- **Cloudflare Pages Functions** free-plan request limits: <https://developers.cloudflare.com/pages/functions/pricing/>
- **TheMealDB**: the free test key is for development and educational use. Sharing with friends fits; a public app-store launch should buy their supporter key.

## Layout

```
src/ingredients/   normalise names, staples list, autocomplete
src/matcher.ts     match a fridge against recipes (<= 2 missing)
src/library/       TheMealDB fetch + IndexedDB cache (weekly refresh)
src/ai/            client for the AI function
shared/            AI prompt, validation, Gemini call (used by the function and tests)
functions/api/     Cloudflare Pages Function: /api/ai-recipes
src/ui/            screens (ingredients, results, detail) and router
```
