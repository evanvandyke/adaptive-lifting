# Repair Review — session 2, 2026-06-11

Two independent auditors examined this project against `_SPEC`. This is the slice that needs your decision. Everything an auto-fix could safely touch is in **Auto-applied** at the bottom; the rest is here because it changes meaning, touches `feedback.md` (never auto-edited), or the two auditors disagreed.

---

## Fix this project (inner)
*Evaluable with zero file access — every change reproduces its current text in full.*

### feedback.md — three coupled violations of the spec's feedback invariants
`~/.agents/projects/-Users-evanvandyke-Documents-Code-Projects-adpative-lifting/memory/feedback.md`. Both auditors flagged this file; `_SPEC` requires a **flat numbered list, ≤150 chars per entry, no `Why:` lines, no category headers**, with rules framed as forward postures. The current file breaks all of these, and its own preamble *teaches* the broken shape. `feedback.md` is never auto-edited — these are proposals for you to apply. Below is the full rebuild: the header fix, then each rule as a BEFORE/AFTER pair.

- **Preamble lines 14 + 16 teach the forbidden shape — fix the boilerplate** · agreed (A finding 7, B finding 4/5)
  - BEFORE (line 14, verbatim): "One file. Categories are `##` headers that emerge as the project needs them. Do not create `feedback_*.md` siblings."
  - AFTER  (line 14, verbatim): "One file, a flat numbered list — no category headers, no `feedback_*.md` siblings."
  - BEFORE (line 16, verbatim): "Each entry: state the rule, then a **Why:** line if the reason isn't obvious. Keep it tight."
  - AFTER  (line 16, verbatim): "Each entry: one forward-posture rule, numbered, ≤150 chars, no `Why:` line — the reason folds into the rule. Max 15."

- **Entry 1 (under `## Sub-agents`) → flat #1, no `Why:`, no scar, ≤150** · agreed (A 4/5/6, B 4/6); A measured 261 chars; both flagged the `Why:` line; B flagged "Never Haiku" as pink-elephant scar-framing
  - BEFORE (verbatim, in full): "**Always spawn sub-agents with `model: \"opus\"`. Never Haiku. **Why:** Evan has seen Haiku cut corners and be unreliable; he has plenty of tokens and wants quality over speed. (This is also a global principle now — kept here as the earned rule that produced it.)"
  - AFTER  (new #1, verbatim, in full): "1. Spawn every sub-agent with `model: \"opus\"` — Evan has tokens to spare and wants the quality." *(91 chars, forward-framed, no `Why:`, scar dropped)*

- **Entry 2 (under `## Verifying work`) → flat #2, no `Why:`, no "Don't" scar, ≤150** · agreed (A 4/5, B 4/7); A measured 396 chars; both flagged the `Why:` line; B flagged the leading "Don't… all done" as scar-framing + a replay of the past failure
  - BEFORE (verbatim, in full): "**Don't declare \"build clean, all done\" off a build pass alone — run the real E2E flow (browser, click through it) before saying it works. **Why:** the first build pass reported clean; Evan immediately hit broken onboarding, a broken profile save, and missing recommended weights. The bugs build checks can't catch (null reps saving zero volume) are exactly the ones that ruin the gym experience."
  - AFTER  (new #2, verbatim, in full): "2. Click through the real E2E flow in a browser before calling it done — a clean build still ships broken onboarding, bad saves, zero-volume reps." *(138 chars, forward-framed, no `Why:`, scar dropped)*

> Net shape after applying: the two `##` category headers (`## Sub-agents`, `## Verifying work`) are removed and the rules become a flat `1.`/`2.` list. The header changes above make the boilerplate match the spec so the next-written rule doesn't inherit the old pattern.

### MIGRATION-REVIEW.md is sitting in the project root, unread, waiting on you
`/Users/evanvandyke/Documents/Code_Projects/adpative-lifting/MIGRATION-REVIEW.md` (5608 bytes, dated 2026-06-05). Both auditors found it; per the audit brief neither read it. A pending review doc needs your disposition before it's cleared. Read it, act on or reject its contents, then delete it (Finder) so the next `/start` isn't flagging a stale review. *(A finding 1, B finding 1 — both `[structural] [inner]`.)*

### AGENDA.md is untracked in git — auditors disagree on whether that's drift; resolved: surface, don't auto-fix
`/Users/evanvandyke/Documents/Code_Projects/adpative-lifting/AGENDA.md` shows `?? AGENDA.md` (I confirmed: `git ls-files --error-unmatch` reports it unknown to git; `git check-ignore` finds nothing — it's never been `git add`-ed, not gitignored). This is your own repo (not under `clients/`), so the version-control policy says `AGENTS.md` / `AGENDA.md` / `Docs_Compressions/` are tracked and committed; `AGENTS.md` and the compression note already are, `AGENDA.md` was just never added.
**Auditors differ:** A calls it a `[mechanical]` finding (one `git add` away) but notes repair doesn't run git itself; B calls it "an incomplete commit, not a policy violation, so not drift per the spec." **Resolved:** it's surfaced here, not auto-fixed — repair runs no git operations, so even on A's read the fix is yours to make. If you want it tracked per policy: `git add AGENDA.md` and commit. No edit was made.

### RESOLVED 2026-09-11 by the migration: the `@AGENTS.md` import is gone. The former stub's one rule is stated inline in AGENTS.md; no separate file remains. (Original finding kept below for the record.)

### CLAUDE.md line 1 was an `@AGENTS.md` import — one auditor flags it, one clears it; resolved: your call
`/Users/evanvandyke/Documents/Code_Projects/adpative-lifting/CLAUDE.md` line 1 is the literal text `@AGENTS.md` (a harness file-import; `AGENTS.md` exists and holds the Next.js "this isn't the Next.js in your training data" rule, which is *also* stated inline at CLAUDE.md lines 28–30).
**Auditors differ:** A flags it `[structural] [outer]` — `AGENTS-SECTIONS.md` documents no import directive, and the imported rule duplicates the inline section, so it's a second source for the same gotcha. B explicitly clears it — "CLAUDE.md sections all conform to `AGENTS-SECTIONS.md`," and the `@AGENTS.md` path resolves. **Resolved:** imports aren't forbidden by `_SPEC`, and the path resolves, so this isn't drift to fix mechanically — but A's point stands that you now have the Next.js rule in two places. Your call: either keep the import (and the outer signal below asks the section menu to document `@`-imports), or fold AGENTS.md's one rule into the existing inline section and drop the import. No edit was made.

### Low-severity FYI — MEMORY.md `name:` carries the project's original typo
`MEMORY.md` line 2: `name: adpative-lifting-memory`. B flagged this (A did not). It mirrors the misspelled project directory `adpative-lifting`, so it's *internally consistent* with the real path — the harness reads the correct directory. B proposed no fix; renaming the project is out of repair scope. Recorded for awareness only; no action needed unless you ever rename the project.

---

## Signals for the system (outer)
*These could happen in any project — they point at the spec/templates/skills in global-project-manager, not just this project.*

- **The `feedback.md` template preamble teaches the exact shape `_SPEC` forbids.** · This file's lines 14 + 16 ("Categories are `##` headers…", "state the rule, then a **Why:** line…") are boilerplate stamped from `~/.agents/project-template/feedback.md`, and they directly contradict the spec's feedback invariants (flat numbered list, no `Why:`, ≤150 chars). Every project stamped from this template inherits a preamble that *invites* the over-long, `Why:`-carrying, category-headered entries we're escalating here. The structure should have prevented these entries from ever being written. · **Proposed fix:** update the `feedback.md` template in `~/.agents/project-template/` so its boilerplate teaches the numbered-list / ≤150-char / no-`Why:` / forward-posture rules, then re-stamp or repair each project's header. *(Both auditors independently reached this; A finding 7, B findings 4/5.)*

- **Pink-elephant scar-framing leaks into `feedback.md` fleet-wide.** · Both earned rules here were written as scars — "Never Haiku" and "Don't declare 'build clean, all done'" — naming the behavior to avoid, which the constitution's pink-elephant principle says plants it. The template preamble's "state the rule, then a **Why:**" framing actively encourages replaying the failure. · **Proposed fix:** the template preamble (above) plus a one-line reminder in it that rules are forward postures, not scars; the repair skill's scar sweep already catches them after the fact, but the template should stop them at write time. *(B findings 6/7; consistent with A findings 4–6.)*

- **The harness's one-fact-per-file default writes stray memory files in every project.** · Two strays appeared here (`feedback_subagent_model.md`, `project_adaptive_lifting.md`) — both harness-style per-fact files the spec's "two files only" rule forbids. `_SPEC` already names `/project-repair` as the standing backstop for this, so it's caught on cadence, but the leakage is systemic: it recurs anywhere this memory model is used. · **Proposed fix:** none new — `_SPEC` already accounts for this (repair consolidates on cadence). Logged so the control tower sees the rate, not as an unhandled gap. *(A findings 2/3, B findings 2/3 — both `[outer]`.)*

- **If `@`-imports in CLAUDE.md are permitted, the section menu should say so.** · CLAUDE.md here opens with `@AGENTS.md`. `_SPEC` doesn't forbid imports, but `AGENTS-SECTIONS.md` (the section index repair audits CLAUDE.md against) documents no import directive — so an import is neither blessed nor flagged, which is exactly why the two auditors split on it. · **Proposed fix:** decide the policy in global-project-manager and encode it — either add an "imports / `@file`" allowance to `AGENTS-SECTIONS.md`, or have `_SPEC` state imports aren't a documented section so repair flags them consistently. *(A finding 9, `[outer]`; B cleared it — the disagreement itself is the signal that the spec is silent here.)*

---

## Auto-applied (FYI, already done)
*Mechanical fixes both auditors agreed on. Per the skill, a stray memory file is consolidated (durable content merged into `MEMORY.md` per the gate), then the empty husk is flagged for you to delete via Finder — never `rm`.*

- **`feedback_subagent_model.md` consolidated — nothing to merge.** · `~/.agents/projects/-Users-evanvandyke-Documents-Code-Projects-adpative-lifting/memory/feedback_subagent_model.md`. Its rule ("Always use Opus (model: \"opus\") when spawning sub-agents. Never use Haiku.") is already fully captured by `feedback.md`'s Sub-agents entry, so the gate routes nothing new into `MEMORY.md`. Both auditors confirmed the duplicate. **Husk left in place — delete it via Finder** (Trash, not `rm`). No `MEMORY.md` edit was needed.

- **`project_adaptive_lifting.md` consolidated — routed per the gate, nothing lands in `MEMORY.md`.** · same directory. Its extra facts route *away* from `MEMORY.md` per the memory router, so no auto-merge: the 9 table names (`profiles, exercises, workouts, sets, body_weight_log, progressions, streaks, nutrition_log, initial_calibration, body_composition`) are code/schema facts → they belong in the schema/code; "all 4 build phases complete (MVP → Intelligence → PWA/Motivation → Post-Launch Enhancements)" → `Implementation-plan.md`; the BAU5/3-week-onboarding algorithm note is already in `AGENTS.md` (line 26) + `README.md`. Evan's stats (211 lbs, 5'9", 43yo, TRT free T ~1200) overlap what `MEMORY.md` already holds ("43, on TRT, returning to lifting after 1+ year off"); the finer numbers are borderline durable-vs-episodic (weight drifts), so **B explicitly warned against auto-merging them** — routing left to you. **Husk left in place — delete it via Finder** (Trash, not `rm`). No `MEMORY.md` edit was made.

> Note: the count "9 DB tables" labels a list of **ten** names — a discrepancy B flagged. That count lives in the husk being removed; the canonical schema is the source of truth, so verify against the code if it matters, not against either doc.
