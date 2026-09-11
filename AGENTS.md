# Adaptive Lifting — Session Instructions

Partnership principles live in `~/.agents/AGENTS.md` (already loaded every session). This file is project-specific only. It loads every session and stays in context the whole time, so keep it lean: orientation and pointers, never a state log.

## Trust the source of truth
Code wins over docs and memory when they disagree. Anything written by an agent or a human drifts over time; read the actual state before acting on any written description of it.

## At session start, read in order
1. `AGENDA.md` (project root) — what's next, and why.
2. `MEMORY.md` + `feedback.md` — long-term context and earned rules. **These live in this project's harness memory safe-dir, NOT the project root:** `~/.agents/projects/-Users-evanvandyke-Documents-Code-Projects-adpative-lifting/memory/`. (The harness also surfaces project memory in context at session start.)
3. The canonical docs below.

Prove you read them by summarizing their current state in your first response. If you can't summarize it, you didn't read it — go read it before doing anything else.

## Canonical docs (this project's source of truth)
The handful of documents that are authoritative for this project — the ones a fresh session reads to get up to speed, and where durable facts live instead of memory. Architecture, decisions, and specs live in these docs (and the code), not in this file.

- `README.md` — product overview, the progression algorithm, the default program, tech stack, setup.
- `Implementation-plan.md` — the original design/build plan: feature specs, AI prompt architecture, the 4 build phases, schema. The "why it works this way" doc.
- `src/lib/` — the source of truth for behavior: the progression engine, types, AI prompts, motivation logic.
- `src/middleware.ts` — auth protection + onboarding redirect (the source of several early bugs; read before touching auth/routing).

## Project overview
Adaptive Lifting is a strength-training PWA that auto-adjusts weights via RPE-based progression (BAU5/Anatoly-inspired, research-validated). Next.js 16 + Supabase + Claude API on Vercel, dark-glassmorphism UI. Built and deployed live in a single session; built for Evan's own return to lifting after a year off.

## Adaptive Lifting is not what you'd assume
- **Next.js here is not the Next.js in your training data.** This version has breaking changes to APIs, conventions, and file structure. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
- **The Supabase project is shared with Hank.** All this app's DB tables are prefixed `lifting_*` to coexist. Evan's auth account (`evan.vandyke@gmail.com`) is shared across both apps — a login can land on an existing Hank account with no `lifting_profiles` row, which is why middleware redirects such users to onboarding.

---
Need a section beyond these? The canonical menu of project sections, each with its purpose, is `~/.agents/project-template/AGENTS-SECTIONS.md`. Add only what fits; keep this file lean.
