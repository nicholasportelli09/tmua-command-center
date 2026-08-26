# TMUA Command Center

A personal quantitative performance dashboard for TMUA preparation. Open it daily to see where you stand, whether you're improving, and the single highest-value thing to work on next.

Target exam is preconfigured to **Friday 16 October 2026, 13:15 Europe/Zurich** with a raw target of **34/40** — both editable in Settings.

---

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** (strict)
- **Tailwind CSS v4** design system (near-black quant-terminal aesthetic, Geist font)
- **IndexedDB** (via `idb`) for local-first persistence — no login, works offline
- **Supabase** (optional) for cross-device cloud sync via server routes
- **Zod** for import validation · hand-rolled **SVG charts** (no charting dependency)
- **Vitest** unit tests for all calculation, conversion, analytics and recommendation logic

## What it does

- **Overview** — countdown, rolling current level /40, target gap, estimated scaled score, a data-driven *Next Best Work* recommendation, score trajectory chart, and compact paper/course progress.
- **Papers** — official past-paper tracker (per-paper status cycling) + full logged-results history with edit/delete. Fast *Log paper* dialog (⌘K) logs a full sitting in seconds.
- **Practice** — self-contained test environment for PDFs you provide: split PDF viewer + A–E answer grid, timer, flags, keyboard shortcuts (A–E / arrows / F), scoring against an answer key.
- **Review** — fast triage of wrong/flagged/slow questions with error-type and topic tagging, and a redo backlog.
- **Analytics** — paper split (P1 vs P2 bottleneck), improvement trend, consistency, topic weakness, error composition, pace.
- **Course** — Clementine Wade course module tracker with overall %.
- **Settings** — exam config, rolling window, prep-phase override, scaled-score conversion tables, workspace sync key, export/import, reset.

---

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. On first load it generates a private workspace key and seeds the official-paper tracker (2016–2023 + Specimen) and a four-week course skeleton. **No configuration is required** — all data is stored locally in your browser and survives refreshes.

### Scripts

```bash
npm run dev        # start the dev server
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # run unit tests (Vitest)
```

---

## Data, backup & workspace sync

Your data lives in the browser (IndexedDB). To move between devices you have two options:

1. **Export / Import** (always available) — Settings → Data → *Export JSON* on one device, *Import backup* on another. There is also *Export results CSV*.
2. **Cloud sync** (optional, needs Supabase) — each device holds the same **private sync key**. Enter it via Settings → *Use an existing workspace* to pull that workspace down.

The sync key is the only credential. Only its **SHA-256 hash** is ever sent to the server; the raw key never leaves your devices.

### Enabling cloud sync (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migration in `supabase/migrations/0001_init.sql` (SQL Editor, or `supabase db push` with the CLI). It creates `workspace_snapshots` with **RLS enabled and no policies**, so the public anon key can never read or write it.
3. Copy `.env.example` to `.env.local` and fill in:

   ```
   SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret
   ```

   The service-role key is used **only** in server-side route handlers (`/api/sync/*`) and is never exposed to the browser. Never prefix it with `NEXT_PUBLIC_`.
4. Restart the dev server. Settings will now show *Cloud sync on*, with *Back up now* / *Restore from cloud*.

If these variables are unset, the app runs fully local-first and the sync UI shows *Local only*.

---

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel (framework auto-detected as Next.js).
2. For cloud sync, add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as Vercel environment variables (Production + Preview). Leave them out to deploy local-only.
3. Deploy. No other configuration needed.

Never commit real secrets — `.env*` files are gitignored; `.env.example` documents the required values.

---

## Architecture

```
src/
  app/                      # routes: overview, papers, practice, analytics, course, settings,
                            #         review/[id], practice/run/[id], api/sync/*
  components/               # ui primitives, layout, overview, papers, course, analytics,
                            #         practice, review, charts, settings
  lib/
    domain/                 # PURE, TESTED core (backend-agnostic):
      types.ts              #   data model
      calculations.ts       #   rolling avg, target gap, P1/P2 split, trend, consistency, completion
      conversion.ts         #   scaled-score interpolation from conversion tables (never invented)
      analytics.ts          #   error composition, topic weakness, pace
      recommendation.ts     #   deterministic "Next Best Work" engine (evidence-based)
      dashboard.ts          #   one selector that derives everything for the UI
    store/                  # IndexedDB repository, seed, workspace key, backup, sync client
    state/data-provider.tsx # React context: loads/seeds data, exposes optimistic mutations
    supabase/server.ts      # server-only service-role client
    utils/                  # id, timezone-correct time math, formatting
```

The intellectual core (calculations, conversion, analytics, recommendations) is **pure and independently unit-tested** — it doesn't depend on React or the storage layer.

## Design decisions worth knowing

- **Local-first, not login-first.** The app is fully usable with zero backend. Supabase is an optional sync upgrade layered on top, so nothing blocks daily use.
- **Cloud model = one JSON snapshot per workspace**, keyed by the hashed sync key, reached only through server routes. The anon key has no access. Uploaded practice **PDFs stay on-device** (they aren't part of the synced snapshot).
- **No invented TMUA conversions.** No raw→scaled data is bundled. Scaled scores are either entered manually or interpolated from conversion tables you add per year/sitting, and are **always labelled "Estimated."**
- **MAT and "Other" results never pollute the TMUA /40 trajectory** — they still feed topic/error analytics.
- **The recommendation engine is deterministic and transparent** (no LLM/API). Every recommendation cites the specific data behind it, and it is phase- and scarcity-aware (it protects unseen official papers early, and shifts to mock-heavy guidance near the exam).
```
