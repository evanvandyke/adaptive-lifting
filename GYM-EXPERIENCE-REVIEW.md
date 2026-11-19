# Gym Experience: Adversarial Review

2026-11-19 · America/Denver

**Final outcome: PASS for Evan's product review. Build-readiness: NOT READY.**

Fable 5.2 (`claude-fable-5-2`) independently challenged [GYM-EXPERIENCE.md](GYM-EXPERIENCE.md), rechecked the revised manuscript, and checked the final clarifications. Its initial three product-brief blockers and all eight findings were resolved. Programming, calibration limits and adaptation mathematics still require definition. This review authorizes no prototype, gym trial or rebuild.

The parent and Codex writer applied the revisions. The main changes make ordinary completed workouts eligible for progression, distinguish an ongoing visit from an abandoned one, preserve truthful history after corrections, and separate a proposed desk walkthrough from real training. Smaller changes clarify provenance, estimates, logging error and reuse of existing code.

**Evidence limits:** Fable received the parent's transcription of all fifteen screenshots, not the original images. The parent inspected those images directly. The full reviews included document and static code reading; the final narrow check used supplied manuscript text. No runtime, database, workout or clinical validation was performed. The acceptance cases are requirements, not passed software tests.

**Remaining decisions:** confirm the proposed progression behavior; establish program fit and training/state rules; decide whether to authorize a desk walkthrough. Existing backlog and canonical-document reconciliation remain separate work if the direction is approved.

**Final manuscript SHA256:** `3f7f1903d50332c7c7546e756abdf850dedd15dfe4626ca24dddada784964a14` (calculated and verified by the parent).

## Final Fable check

**Reviewer:** Fable 5.2 (`claude-fable-5-2`)

**Product brief: PASS.** No remaining blocker.

**Build-readiness: NOT READY.** The brief still says so itself: programming, calibration limits and adaptation maths remain blockers, and the prototype, gym trial and rebuild are unapproved.

All five changes are present and introduce no conflict:

1. **Count visibility:** the Last-set paragraph now says the count is visible before confirming and reps are not sensed. This matches the Record row and the "infers no reps" acceptance row.
2. **Over-confirmation:** decision 2 requires tolerance through bounded changes and corroborating history. This matches "repeated confirmed completion across comparable sessions".
3. **Walkthrough order:** it may precede program and numerical decisions because its fixtures are scripted. Evan's go is still required, and the gym trial is still separately gated.
4. **"Including":** the inherited-rule list is no longer exhaustive. Warm-up components remain reuse candidates while their percentages are excluded.
5. **UTC dates:** stated as a static finding needing a targeted audit, with no runtime claim.

**Non-blocking:** change 5 cites `actions.ts:15,345`; my earlier note also listed `:428`.

**Source limits:**
- I reviewed the supplied text only, with no images, code, runtime or clinical validation.
- The SHA256 is the parent's; I did not compute it.
- I had no prior manuscript text to diff, so "no other changes" rests on the parent.

## Initial adversarial review — before revisions

The following is Fable's original report. Its NEEDS REVISION verdict applies to the initial draft, not the final manuscript. Source-line references in each review refer to the draft that reviewer read.

### Adversarial review: GYM-EXPERIENCE.md

**Reviewer:** Fable 5.2 (`claude-fable-5-2`), working alone and read-only.

**Verdict for the product brief: NEEDS REVISION.** Findings 1–3 are blockers for the brief, and each is a paragraph-sized fix. The direction itself is sound and matches Evan's intent.

**Build-readiness: NOT READY.** The brief says so itself, and nothing here authorizes implementation.

#### Scope and evidence limits

- **Read:** global and project AGENTS.md, AGENDA.md, the brief in full, both research reports, `workout/actions.ts` and `lib/progression.ts` in full.
- **Not read:** project memory, README, Implementation-plan, the dashboard page beyond one grep.
- **Screenshots:** I saw no images or video. Everything about BAU5 comes from the parent's transcription.
- **Code:** static reading only, with no browser or database test. The brief's code claims at line 91 are accurate.
- **Packet inferences beyond screenshot facts:**
  - Lower B's label being "emphasis, not isolation" is an inference.
  - The 6→4 decrement was never captured, so 115×4 may have been set by the app or by the user.
- **Unverifiable:** the "04:46 MST" timestamp at brief line 29 is not in the packet. Confirm it or remove it.

#### Findings

##### 1. HIGH, brief blocker: the commonest path produces no upward progress (lines 52, 60, 69, 103)

Four rules combine badly:
- Stopping at target leaves capacity unknown.
- Ambiguous evidence favors holding.
- Last-set extras are declinable with no penalty.
- Effort ratings are optional.

**Failure example:** Evan confirms "as planned" on every set for six weeks and skips extras. The app holds his loads indefinitely and never says why. The brief makes repeated difficulty actionable, but not repeated clean completion.

A related risk: a one-tap habit on the last set records his 5+2 as "stopped at 5".

**Minimum fix:** state the behavior without numbers. Choose one:
- Repeated clean completion across comparable sessions earns a bounded, explained increase.
- The app says plainly that progress needs occasional last-set extras or a one-tap answer.

Also show the last set as "target or more" before the lift, and have the confirm control display the count being confirmed. Add an acceptance row for this path.

##### 2. HIGH, brief blocker: the prototype step contradicts the blockers (lines 7, 56, 111, 113–119)

The next step prototypes "one complete workout" on "illustrative data" and measures estimate accuracy. That only works in a real gym session, where the numbers on screen become what Evan lifts. The calibration row also needs caps and a fallback that are still undefined. The step reads as authorized, and the order against decisions 1–2 is unclear.

**Minimum fix:**
- Mark the step as a proposal awaiting Evan's go.
- Declare the mode. A desk walkthrough uses visibly labelled sample numbers and makes no accuracy claim. A gym trial uses loads Evan chooses himself, with adaptation output off or marked not-a-prescription.
- State which acceptance rows are untestable until decision 2.

##### 3. HIGH, brief blocker: unfinished-session resume is unbounded (lines 39, 81, 110)

"Resumes rather than advancing" has no staleness boundary. The likeliest behavior for someone who wants to get done and go, leaving without tapping End, is uncovered.

**Failure example:** Evan walks out with two sets left. Three days later the app offers Resume mid-exercise. Sets from two days merge into one session and count as comparable evidence, while the rotation is stuck.

**Minimum fix:**
- Resume applies to the same visit.
- Past a boundary (value left to the training rules), the app proposes closing the session as partial and shows the next due session. It never auto-completes sets or merges days.
- Split "long gap" and "midnight" into separate rows, and add a "left without ending" row.

**Code facts for the foundation section** (later build work, static reading):
- Workouts are keyed one per UTC date (`actions.ts:15`, `:345`). That rolls over at 5 PM Denver winter time, so an evening workout can disappear mid-session.
- `getNextSessionType` (`actions.ts:365–384`) ignores unfinished workouts.

##### 4. MEDIUM: correction semantics leave state ambiguous (lines 71, 107)

"Recalculates affected future guidance" doesn't say what stays frozen.

**Failure example:** Evan corrects set 1 after completing set 2, and set 2's load came from the wrong value. Either set 2's prescription is rewritten after the fact, or a later comparison trusts it as an appropriate test.

**Minimum fix:** name three tiers.
- Completed sets keep the prescription as issued, plus an editable actual. A set whose prescription came from corrected data is flagged as weaker evidence.
- The current set stays pending.
- Unstarted sets and sessions are recomputed.

Also say what happens to unconfirmed sets at End: not recorded, with a quick back-fill.

##### 5. MEDIUM: "What Evan has established" mixes in author proposals (lines 14–15, 31)

- **Line 15** (nutrition, photos, sharing and AI coaching out of first scope) has no supporting statement in the packet. It also conflicts with AGENDA.md, where the nutrition test is Up Next and progress photos are For Sure.
- **Line 14** states the last-set signal as settled. The source is an "if I remember right" recollection plus Evan endorsing the parent's framing.
- **Line 31** says the post-set interaction is "now visible". Screens 8–15 are all trial sets. Normal-set recording and capstone entry are unobserved, and the adjust step rests on the uncaptured decrement.

**Minimum fix:** move line 15 to proposals and flag the AGENDA reconciliation for the parent. Reword line 14 as "recalled and endorsed as a signal". Limit line 31 to trial sets.

##### 6. MEDIUM: the acceptance walkthroughs can't fail (lines 99–111)

Several results are unfalsifiable: "can clarify… or retain uncertainty", "shortened coherently", "behavior is explicit".

Missing cases:
- **Open with zero decisions:** one screen shows focus, estimated time and Start. This is Evan's headline requirement.
- **Bad day versus trend:** several short sets change today's numbers and leave the baseline alone, while a repeat stays actionable.
- **Prescribed weight unavailable.**
- **Short-set question repetition:** the question is asked once per exercise, not after every short set.

**Minimum fix:** give each row an observable pass/fail (what is shown, what is stored, how many actions) and add these cases. No dosing numbers are needed.

##### 7. MEDIUM-LOW: reuse candidates carry unvalidated numbers (lines 56, 93)

The brief disclaims fabricated starting-strength math, yet the foundation it proposes to reuse contains exactly that:
- Bodyweight multipliers and time-off factors (`actions.ts:90–121`).
- A starting load of 0.8 × estimated 5RM (`:114`).
- "Drop 10%" advice text (`:264–275`), which the dashboard reads.
- Warm-up percentages, including a 90% single (`progression.ts:142–160`).

**Minimum fix:** add one sentence saying component reuse excludes their embedded numbers, which fall under decision 2.

Separately, line 93 floats "database and authentication replacement". Evan didn't ask for that, and auth is shared with Hank. State the default as keep, unless the audit shows cause.

##### 8. LOW: the time estimate overpromises (line 79)

The app can't know equipment waits. BAU5's own reviews complained that workouts ran longer than stated. Say "an allowance, shown as approximate and updated from actuals".

Also add long-gap return rules and discomfort follow-up to decision 2. Both are currently unowned.

#### What holds up

- Walkthrough weights are not treated as Evan's performance.
- BAU5's formula stays unknown and the research is not overclaimed.
- Rest expiry is non-coercive.
- Calibration is bounded and its blockers are honestly stated.
- Per-set input is one confirmation.
- The Hank boundary is preserved.

#### Essential unresolved decisions (Evan)

1. **The upward signal.** Either last-set extras (or a one-tap answer) become the normal way loads go up, or clean completion alone advances conservatively.
2. **Program fit.** Realistic days per week, usual time budget and gym equipment.
3. **Prototype mode and go-ahead.** Desk simulation, or a gym trial with self-chosen loads.

#### Recheck after edits

- Lines 52, 60, 69 and 103 no longer imply a silent indefinite hold, and a matching acceptance row exists.
- The next step is labelled a proposal with a declared mode and labelled data.
- Resume has a staleness rule, and the "left without ending" and split gap/midnight rows are present.
- The correction tiers are stated.
- The established list contains only packet-supported items, and line 31 is limited to trial sets.
- Every acceptance row can fail.
- New wording introduces no numbers, medical claims or BAU5 mechanism claims.

## Full recheck — before the final clarifications

This pass closed the initial findings and identified five non-blocking notes. The final manuscript incorporates the clarity, logging-error, sequencing, numerical-rule and UTC-date points. Broader canonical-document reconciliation remains outside this write-up.

### Re-review: GYM-EXPERIENCE.md (revised)

**Reviewer:** Fable 5.2 (`claude-fable-5-2`), working alone and read-only.

**Product brief: PASS.** All three former blockers are closed, and no new blocker came from the fixes.

**Build-readiness: NOT READY.** The brief says so itself at lines 7 and 126–132.

**The manuscript is ready for Evan's product review. It is not approved for implementation and not clinically validated.**

#### Evidence limits

- **File reviewed:** the revised brief in full (137 lines). The SHA256 `da809b12…` is the parent's calculation; I did not compute it.
- **Screenshots:** I viewed no image files. All BAU5 facts rest on the parent's transcription.
- **Timestamp:** the 04:46 MST at line 28 is accepted on the parent's direct verification.
- **Code:** static reading only, with no browser or database test.
- **Orientation now complete:** I read everything listed in the brief for this pass, plus AGENDA.md and both research reports.
  - AGENDA.md has an empty ACTIVE slot; its Up Next items are warm-up/plate verification, the nutrition test and the Start double-click.
  - Memory holds the Hank-shared Supabase fact, the momentum-over-perfection stance and the rule to verify the phone flow in a real browser.
  - README and Implementation-plan still describe RPE-threshold progression as working and "research-validated". The code contradicts this: `calculateProgression` has no caller, which matches brief line 98.
  - `middleware.ts` only delegates to `updateSession`.

#### Status of findings 1–8

| # | Finding | Status | Where |
|---|---|---|---|
| 1 | No upward progress on the commonest path | **Resolved** | Lines 51, 66, 68; row 112 |
| 2 | Prototype step contradicted the blockers | **Resolved** | Lines 7, 106, 130–132; row 124 |
| 3 | Unbounded resume | **Resolved** | Lines 38, 84–88; rows 121–123 |
| 4 | Correction semantics | **Resolved** | Lines 70–74, 86; row 118 |
| 5 | Established list mixed with proposals | **Resolved** | Lines 14, 16, 30, 102 |
| 6 | Acceptance rows couldn't fail | **Resolved** | Rows 110–124 |
| 7 | Reuse carried unvalidated numbers | **Resolved** | Line 100 |
| 8 | Time estimate overpromised | **Resolved** | Lines 82, 88; decision 2 |

- **1:** Ordinary completion is now stated as positive evidence that can earn a bounded, explained increase. The last set is labelled before lifting, and the completion control shows the count.
- **2:** The desk walkthrough is a proposal awaiting Evan's go, with labelled sample data and no accuracy or dose claims. The gym trial is separately gated.
- **3:** Resume is limited to the same visit, stale visits close as partial with one confirmation, and the boundary value is assigned to decision 2.
- **5:** The scope exclusion is now a proposal with an AGENDA reconciliation flag. Observation claims are limited to trial screens.
- **7:** Embedded numbers are excluded from reuse, and the default is to keep auth and the Hank boundary.
- **Evidence and research sections:** I rechecked the tables against the packet and the research boundary against both reports, and found no overclaims.

#### Remaining blockers

None for the brief.

#### Non-blocking notes

1. **The habitual tap now errs upward (new consequence of fix 1).**
   - Case: Evan gets 4 of 5, the control reads "Confirm 5", and he taps from habit. That now counts as clean completion and feeds an increase. Before the fix the same slip only caused a hold.
   - The showing of the count, undo and bounded increases reduce this but cannot prevent it.
   - Minimal fix: one sentence assigning this risk to decision 2, saying the rules must tolerate an over-confirmed set.
   - Also soften line 51's "not silently discarded" to "visible before confirming".
2. **Step order is ambiguous (lines 126–132).** The walkthrough is listed third but named as the next step. Add one clause saying it can run before decisions 1–2 because it uses scripted rules.
3. **Line 100's list reads as exhaustive.** The same unvalidated class includes:
   - the thresholds in `progression.ts` (the RPE cut-offs, +2.5/+5 lb increments and 20% deload);
   - the fixed 5-rep target;
   - the duplicated multipliers in `dashboard/page.tsx:191,220` and `onboarding/page.tsx:77`.

   Adding "including" covers it.
4. **A code fact for the later audit.** Workouts are keyed by UTC date (`actions.ts:15`, `:345`, `:428`). That conflicts with line 84's local-time target, because the date rolls over at 5 PM Denver winter time. One sentence in the foundation section would stop this getting lost.
5. **Canonical docs will go stale if the direction is approved.** The README algorithm table and the "research-validated" wording in AGENTS.md would then describe behavior the app does not have. This is reconciliation work for the parent, outside this brief.

#### Essential decisions for Evan

1. **Progression behavior.** Confirm the proposal that ordinary completion alone advances loads conservatively, with last-set extras refining the signal, not gating it.
2. **Program fit and training rules.** His realistic days per week, usual time budget and equipment come first. The split, calibration limits, thresholds, same-visit boundary and long-gap policy follow from those (decisions 1–2 in the brief).
3. **Desk walkthrough.** Go or no-go, and whether it runs before or after decision 2. The gym trial stays separately gated.
