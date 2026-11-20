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

- `README.md` — product overview, legacy-versus-candidate boundary, setup and validation commands.
- `GYM-EXPERIENCE.md` + `PROGRAM-DIRECTION.md` — guided workout behavior and Evan's confirmed constraints.
- `ENGINE-SPEC.md` + `engine/src/` — exact standalone candidate policy and implementation; read before changing engine or workout behavior. `ENGINE-REVIEW.md` and `engine/reports/SUMMARY.md` record review and executed-snapshot evidence.
- `src/app/lift/` — the live guided workout ("Signal") at `/lift`, where sign-in lands: `coach/coach.ts` plans each visit (tests: `npm run test:coach`), `visit/use-visit.ts` runs it, `store.ts` keeps it on the phone and syncs to Supabase, `signal/` is the screens. `/lift/preview` is a dev-only no-login copy. Tables: `supabase/signal-tables.sql`.
- `CLAUDE-DESIGN-PROMPT.md` — visual freedom and gym usability requirements; read before UX/UI work.
- `Implementation-plan.md` — historical original design/build plan, AI prompts and schema; use it for original intent, not proof of current behavior.
- `src/lib/` + `src/app/(protected)/workout/actions.ts` — legacy app types, prompts, motivation and current workout creation/completion behavior. The separate legacy progression helper has no caller in this flow.
- `src/middleware.ts` — auth protection + onboarding redirect (the source of several early bugs; read before touching auth/routing).

## Project overview
Adaptive Lifting is a strength-training PWA for Evan's return to lifting. The app uses Next.js 16, Supabase and Claude API on Vercel. The live flow is the Signal workout at `/lift`, planned by its own small coach module. The standalone experimental engine in `engine/` is parked and connected to nothing, and the older dashboard/workout pages are legacy; integration of either must be explicit. Research informs the direction, while exact numerical rules remain testable engineering hypotheses. Visual redesign follows the Claude Design handoff rather than assuming the existing styling is a requirement.

## Adaptive Lifting is not what you'd assume
- **Next.js here is not the Next.js in your training data.** This version has breaking changes to APIs, conventions, and file structure. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
- **The Supabase project is shared with Hank.** All this app's DB tables are prefixed `lifting_*` to coexist. Evan's auth account (`evan.vandyke@gmail.com`) is shared across both apps — a login can land on an existing Hank account with no `lifting_profiles` row, which is why middleware redirects such users to onboarding.

**At session end:** run the wrap skill (`~/.agents/skills/wrap/SKILL.md`).

---
Need a section beyond these? The canonical menu of project sections, each with its purpose, is `~/.agents/project-template/AGENTS-SECTIONS.md`. Add only what fits; keep this file lean.
