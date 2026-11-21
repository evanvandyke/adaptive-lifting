# Adaptive Lifting — Session Instructions

Read `/Users/evanvandyke/.agents/AGENTS.md` and follow its session-start entrypoint. Read this project file explicitly each session; it contains project-specific orientation and pointers.

## Trust the source of truth
Code wins over docs and memory when they disagree. Anything written by an agent or a human drifts over time; read the actual state before acting on any written description of it.

## At session start, read in order
1. `AGENDA.md` (project root) — what's next, and why.
2. `MEMORY.md` + `feedback.md` — long-term context and earned rules. **Read both files in full from this project's memory directory:** `/Users/evanvandyke/.agents/projects/-Users-evanvandyke-Documents-Code-Projects-adpative-lifting/memory/`.
3. The canonical docs below.

Prove you read them by summarizing their current state in your first response. If you can't summarize it, you didn't read it — go read it before doing anything else.

## Canonical docs (this project's source of truth)
The handful of documents that are authoritative for this project — the ones a fresh session reads to get up to speed, and where durable facts live instead of memory. Architecture, decisions, and specs live in these docs (and the code), not in this file.

- `README.md` — what is live, the database, what is parked, setup and validation commands.
- `src/app/lift/` — the live guided workout ("Signal") at `/lift`, where sign-in lands: `coach/coach.ts` plans each visit (tests: `npm run test:coach`), `visit/use-visit.ts` runs it, `store.ts` keeps it on the phone and syncs to Supabase, `signal/` is the screens. `/lift/preview` is a dev-only no-login copy. Tables: `supabase/signal-tables.sql`.
- `src/app/(auth)/` + `src/utils/supabase/middleware.ts` — sign-in, sign-up and the routing gate; read before touching auth or routing.
- `docs/product/GYM-EXPERIENCE.md` + `docs/product/PROGRAM-DIRECTION.md` — guided workout behavior and Evan's confirmed constraints.
- `docs/product/CLAUDE-DESIGN-PROMPT.md` — visual freedom and gym usability requirements; read before UX/UI work.
- `docs/engine/ENGINE-SPEC.md` + `engine/src/` — the parked standalone candidate's policy and implementation; read before changing the engine or folding its ideas into the coach. `docs/engine/ENGINE-REVIEW.md` and `engine/reports/SUMMARY.md` record review and executed-snapshot evidence.
- `plans/` — the burn-down lists the agenda points to; read the one for the item being worked.

## Project overview
Adaptive Lifting is a strength-training PWA for Evan's return to lifting, shared with his brother. The app uses Next.js 16 and Supabase on Vercel. The live flow is the Signal workout at `/lift`, planned by its own small coach module. The standalone experimental engine in `engine/` is parked and connected to nothing; folding any of it into the coach must be explicit. The original dashboard, workout, nutrition and AI pages were retired on 2026-11-20 and live only in git history and `archive/`. Research informs the direction, while exact numerical rules remain testable engineering hypotheses.

## Adaptive Lifting is not what you'd assume
- **Next.js here is not the Next.js in your training data.** This version has breaking changes to APIs, conventions, and file structure. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
- **The app has its own Supabase project** (ref `ljyqtcosoigsribpyiwq`, under a dedicated Gmail plus-address login of Evan's, free plan, which pauses after about a week unused). It holds three tables, all prefixed `lifting_`. It is not the Hank project the app started on; that one is unreachable and nothing here points at it.

**At session end:** run the wrap skill (`~/.agents/skills/wrap/SKILL.md`).

---
Need a section beyond these? The canonical menu of project sections, each with its purpose, is `~/.agents/project-template/AGENTS-SECTIONS.md`. Add only what fits; keep this file lean.
