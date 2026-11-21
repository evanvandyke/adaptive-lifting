# Adaptive Lifting

**One set at a time.**

A strength-training app for the phone, built for someone returning to lifting. You show up and lift; the app decides what comes next. Live at https://adaptive-lifting.vercel.app.

## What is live

**The Signal workout, at `/lift`** (`src/app/lift/`). Sign-in lands there.

- `coach/coach.ts` plans each visit from the history of finished visits. Its rules are listed at the top of the file and tested by `npm run test:coach`.
- `visit/use-visit.ts` runs a visit, one set at a time.
- `store.ts` keeps everything on the phone in `localStorage` first and syncs finished visits to Supabase when it can.
- `signal/` holds the screens and the drawn lifter.
- `/lift/preview` is the same app with no login, in development only.
- A "!" tab on every screen sends a problem report with the page and workout state attached.

Sign-in and sign-up are in `src/app/(auth)/`, in the same black and yellow look. `src/utils/supabase/middleware.ts` sends signed-out visitors to `/login` and signed-in visitors to `/lift`.

## Database

One Supabase project of its own, with three tables, all locked to their owner: `lifting_signal_visits`, `lifting_signal_state`, `lifting_feedback`. The definitions are in `supabase/signal-tables.sql`; on a fresh project, run that file once in the SQL editor. Email confirmation is off, so a new account is in at once.

## What is parked

The standalone engine in [`engine/`](engine/README.md) is a larger candidate for the planning rules. It has no connection to the live workout, sign-in or the database. [`docs/engine/ENGINE-SPEC.md`](docs/engine/ENGINE-SPEC.md) is its policy, [`docs/engine/ENGINE-REVIEW.md`](docs/engine/ENGINE-REVIEW.md) its review status, and the [latest simulation report](engine/reports/SUMMARY.md) its executed snapshot and limits. A passing software check does not establish training effectiveness or physical suitability. Whether its ideas move into the coach is an open decision: see `plans/coach-and-engine.md`.

`npm run check:engine` runs a fresh compile, its behavior tests and its scripted histories.

## Direction and design

- [`docs/product/GYM-EXPERIENCE.md`](docs/product/GYM-EXPERIENCE.md) and [`docs/product/PROGRAM-DIRECTION.md`](docs/product/PROGRAM-DIRECTION.md): how a guided workout should behave, and Evan's confirmed constraints.
- [`docs/engine/TRAINING-PLAN.md`](docs/engine/TRAINING-PLAN.md): planning context for the engine candidate.
- [`docs/product/CLAUDE-DESIGN-PROMPT.md`](docs/product/CLAUDE-DESIGN-PROMPT.md): visual freedom and gym usability requirements.
- `design/`: the app icon rounds and the intro video materials.
- `plans/`: the burn-down lists the agenda points to.

## Setup

```bash
npm install
```

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

```bash
npm run dev          # the app
npm run test:coach   # the coach's rules
npx tsc --noEmit     # types
```

Stack: Next.js 16 (read `node_modules/next/dist/docs/` before writing code; this version differs from older ones), React, Supabase, deployed on Vercel from `main`.

## History

The original app (dashboard, RPE-based workout pages, nutrition tracker, AI analysis) was retired on 2026-11-20 when the app moved to its own database. Its code is in git history before that date, and its README and build plan are in `archive/`.
