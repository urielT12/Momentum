# Momentum

A mobile-first fitness tracker (installable web app / PWA):

- **Today**: calories eaten vs. goal, protein / carbs / fat, steps and active calories, the day's meals and workouts. Swipe back through previous days with the arrows.
- **Meal scanning**: take a photo → Gemini estimates each food's portion, calories and macros → review/edit → save.
- **Workouts**: import Garmin `.FIT` / `.GPX` files, or add workouts manually.
- **Multi-user**: email/password accounts, every row protected by Postgres row-level security.

Stack: Next.js 16 (App Router) · Supabase (Auth, Postgres, Storage) · Gemini API (vision, free tier) · Tailwind CSS 4. Deploys to Vercel.

## Setup

1. **Supabase** – create a project at [supabase.com](https://supabase.com), open **SQL Editor**, paste and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   - For quick testing you can turn off **Authentication → Sign In / Providers → Email → Confirm email**. If you keep it on, set **Authentication → URL Configuration → Site URL** to your app URL.
2. **Gemini (optional, free)** – create an API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). No credit card needed. Free-tier requests may be used by Google to improve its products, and have per-minute/per-day limits. Without a key, photo scanning is hidden and meals are entered manually.
3. **Env (local development only)** – `cp .env.example .env.local` and fill in the values. `.env.local` is gitignored and never committed; the deployed app gets its keys from GitHub Secrets (see Deploy).
4. `npm install && npm run dev` → http://localhost:3000

### Try it on your iPhone during development

Your phone and PC must be on the same Wi-Fi. Find your PC's IP with `ipconfig` (e.g. `192.168.1.20`), run `npm run dev -- -H 192.168.1.20`, and open `http://192.168.1.20:3000` in Safari. Photo upload works over plain HTTP on the local network.

## Deploy (so it works anywhere from your phone)

Deployment runs from GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) on every push to `main`. Keys live only in **GitHub → Settings → Secrets and variables → Actions** and are handed to Vercel per deployment.

1. Create a Vercel project once: `npx vercel login`, then `npx vercel link`. This writes `.vercel/project.json` (gitignored) with your `orgId` and `projectId`.
2. Create a token at **vercel.com/account/tokens**.
3. Add these repository secrets:

   | Secret | Value |
   |---|---|
   | `VERCEL_TOKEN` | token from step 2 |
   | `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
   | `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public by design, protected by RLS) |
   | `GEMINI_API_KEY` | optional; enables photo scanning |

   With the GitHub CLI you can load the app keys straight from your local file: `gh secret set -f .env.local`.
4. Push to `main` (or run the workflow manually from the Actions tab). The deployment URL appears in the run summary.
5. In Supabase, set **Authentication → URL Configuration → Site URL** to the Vercel URL.
6. On the iPhone: open the URL in Safari → Share → **Add to Home Screen**. It launches full screen like a native app.

To rotate a key, update the GitHub secret and re-run the workflow.

## Getting Garmin data in

| What | How (MVP) |
|---|---|
| Workouts | Garmin Connect → activity → ⚙ → **Export Original** (unzip → `.fit`) or **Export to GPX** → upload on the Workouts tab. Duplicates are skipped. |
| Steps / active calories | Enter from the Garmin app on the Today screen. |

Automatic sync options for later: apply to the [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/) (Health API push), use an aggregator such as Terra, or wrap the app in a native shell (Expo/Capacitor) to read Apple Health, which Garmin Connect already syncs into.

## Project layout

```
src/
  proxy.ts                     session refresh + redirect to /login
  app/(app)/                   signed-in screens (Today, Log meal, Workouts, Settings) + server actions
  app/api/meals/analyze        uploads photo to Storage, calls Gemini, returns estimate
  app/api/workouts/import      parses .fit/.gpx and inserts workouts
  lib/nutrition.ts             Gemini vision prompt + structured output schema
  lib/workout-import.ts        FIT/GPX parsing
supabase/migrations/           database schema, RLS policies, storage bucket
```

## Roadmap

- Social feed: friends/follow table, a `visibility` column on meals/workouts, RLS policies that allow followers to read shared posts, likes/comments.
- Automatic Garmin / Apple Health sync.
- Weekly trends and charts, saved/favourite meals, barcode scanning.
