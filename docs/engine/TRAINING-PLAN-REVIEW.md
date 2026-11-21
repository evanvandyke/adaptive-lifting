# Training Plan: Review Record

Thursday, 2026-11-19 · America/Denver

**Final outcome: PASS for planning review; NOT READY for implementation.** Fable 5.2 closed all 13 original findings and verified the final clarifications. The initial verdict below applies to the earlier draft. This record concerns [TRAINING-PLAN.md](TRAINING-PLAN.md), not the earlier gym-experience manuscript.

**Subsequent user clarification, November 19 at 07:06 MST:** Evan reported no injuries and described himself as basically starting from zero. The parent updated the plan's starting context and remaining-work descriptions accordingly: establish current ability rather than using historical loads or treating the ordinary ten-set template as a first-visit quota. This context update postdates the reviewed snapshot below; numerical rules are unchanged. References to the pending personal answer in the preserved reviews describe their earlier checkpoint.

## Evidence and verification

A separate research agent checked the evidence and timing independently without reading the writer's draft. The parent read the source material, the finished draft and its references, and recalculated all five initial timing rows. The research check supported the broad direction while rejecting a guaranteed 18–24-set, 30-minute session and equivalence between floor-only work and a full gym program. No code, database, runtime or gym testing took place.

Fable reviewed the draft using document and static-code reading. It had no web tools; its external-source conclusions rely on the supplied evidence checks. Its original report is preserved below. The parent subsequently verified that Anatoly's public sample lists 1×2 sets, while their intensity is not specified; the revision therefore replaced “heavy doubles” with “sample doubles”.

Initial manuscript SHA256: `ed3fb01d2fa5e1301a4afae7b94dcd4317f22bd08992623c9500d2029d7295c9`.
Reviewer model confirmed by execution result: `claude-fable-5-2`.
Review session: `99c2fdfb-0194-45d3-aa6a-759ceb0c3d4b`.
The review's line numbers and agenda observations refer to the files it read during that pass.

## Parent decisions for the revision

- Keep Evan's approximately 30-minute planning budget as the default. The familiar 18–24 sets remain a reference for longer sessions, not a simultaneous time guarantee. The proposed lower starting volume remains visible for his review.
- Capture actual equipment increments when the gym is known. Evan has not joined it yet; this is a future setup input, not a question he must answer now.
- Borrow Anatoly's compound-lift emphasis. His exact barbell exercises and sample routine are not requirements Evan imposed; the proposed dumbbell variants remain open to his preferences and movement suitability.
- The current personal question is injuries, recurring pain or excluded movements. No answer has been received at this checkpoint; the draft does not assume clearance.
- Preserve the distinction between a coherent planning draft and a tested implementation. Numerical defaults and the combined algorithm still need simulation and later validation.

## Final manuscript and remaining work

Final reviewed manuscript SHA256: `84ba696283f44e31aee2bec592b5939707646eee587e91deca82a8166c8c294c`.

The parent read back the final manuscript, checked its local links and independently recalculated the timing. The proposed gym baseline estimates 28.2/30.0 minutes for A/B; straight-set fallback estimates 30.2/31.7, and the known home template 15.7. These are model outputs, not measured durations. The scripted state cases remain requirements rather than executed software tests. App code was not changed.

Before implementation, define exercise-specific initial loads, allowed variation transitions, coarse-step trial limits and return-load proposals, and resolve Evan's movement restrictions. Carry the final review's cumulative-increase question into that policy work: specify both within-visit and repeated-visit limits. Matching bodyweight variants intentionally share rep history across settings; performance in a different movement never converts to a gym lifting weight. These are separate from the closed planning findings.

## Final Fable check

# Final narrow check: TRAINING-PLAN.md

**Planning verdict: PASS.** Notes A–E are all applied, and none of the changes introduces a contradiction or a new blocker.

**Build-readiness: NOT READY.** The draft still says so (`TRAINING-PLAN.md:5,116`). Evan's injury and movement answer is pending, and the exercise-specific policies remain named build blockers.

## A–E

| Note | Status | Where |
|---|---|---|
| A. No-feedback trial | **Resolved.** A completed floor trial with no reported difficulty supplies the provisional load and infers neither Easy nor safety. | `:42` |
| B. Easy ceiling | **Resolved.** One upward recalibration step per established movement per visit, plus a required cumulative cap listed among the build decisions. | `:42, 116` |
| C. Headline | **Resolved.** "About ten working sets", with eleven only if measured timing permits; the timing summary agrees. | `:9, 89` |
| D. Home checks | **Resolved.** Four floor-only checks share the six-minute cap and recovery, retries draw on the same budget, and gym and weighted limits are unchanged. | `:67` |
| E. Straight sets and end state | **Resolved.** I recomputed the row: 970 s and 1,060 s plus 14 min give 30.2 and 31.7 minutes. The twice-failed coarse trial now has an explained hold with an alternative or reassessment route. | `:86, 59` |

The 60 and 80 seconds in E match the plan's own per-pair change values (40 + 20 and 60 + 20). The explained hold also agrees with `PROGRAM-DIRECTION.md:65`.

## Two wording notes (non-blocking)

- **Cumulative cap scope.** Line 42 calls it an "exercise-specific cumulative increase cap"; line 116 calls it a "cumulative per-visit" cap. With one step per visit already fixed, the cap that matters is across visits: Easy tapped at every visit could still raise a coarse dumbbell load three times a week. Say which is meant when the policy is written.
- **Shared histories.** `PROGRAM-DIRECTION.md:14` says home results do not change gym lifting weights. The plan gives identical bodyweight movements one history across settings (`:32, 73`), so home dead bugs or split squats can move a gym rep target. That fits the letter (reps, not weights) and line 13, but a clause in either file would make the intent explicit.

## PROGRAM-DIRECTION.md status updates

These are compatible with the plan.

- **Intro (`:5`):** links the draft and the review record, and labels both as proposals. The linked `TRAINING-PLAN-REVIEW.md` exists; I did not read its contents.
- **Mid-document status (`:35, 47, 51`):** each describes what the draft proposes without claiming implementation.
- **Next work (`:75`):** states that a planning pass is not build readiness.

## Limits

This was a document reading of two files, checking only the A–E changes and the status paragraphs. I verified no sources. Nothing here is clinical or runtime validation, and every numerical default remains the plan's own heuristic.

## Fable recheck — before final wording clarifications

Reviewed manuscript SHA256: `530c7c95da00287a2933bab71e8979f2972b01fb960aa405fec30856fc80048f`.

# Recheck: TRAINING-PLAN.md (revised)

**Planning verdict: PASS** as a planning draft for Evan's review. All 13 findings are closed at the planning level and I found no new blocker.

**Build-readiness: NOT READY.** The draft says so itself (`TRAINING-PLAN.md:5,116`). Evan's injury and movement answer is pending, and the starting-load, coarse-step and return-load policies are named build blockers. No numerical default here is clinically validated; they are all the plan's own heuristics.

## Status of findings 1–13

| # | Finding | Status | Where |
|---|---|---|---|
| 1 | 5% cap blocked every load increase | **Resolved as a transition**; policy is a build blocker | `:54-56`, case `:109` |
| 2 | No way up from a too-light start | **Resolved**, with note A below | `:36, 40, 42, 53, 60` |
| 3 | First week, return and credit undefined | **Resolved** | `:44, 93, 95, 99` |
| 4 | Partial-session rotation | **Resolved** | `:95` |
| 5 | Going down needed an answer; no plateau rule | **Resolved** | `:57-59`, cases `:110-111` |
| 6 | "Comparable" undefined | **Resolved** | `:50, 60` |
| 7 | Correction after the trial was performed | **Resolved** | `:61`, case `:113` |
| 8 | Extras inert and ambiguous | **Resolved** | `:53`, case `:108` |
| 9 | Volume could not grow inside 30 minutes | **Resolved** by the parent's budget decision, stated honestly | `:9, 30, 89` |
| 10 | Optimistic timing | **Resolved**; arithmetic rechecked | `:77-87` |
| 11 | Exercise identity and per-side rule | **Resolved** | `:32, 73` |
| 12 | Home progression inert | **Resolved**, with note D below | `:67, 73, 87` |
| 13 | 48-hour and 6-hour rules, double credit | **Resolved** | `:93, 97` |

Details on the three that carry conditions or a recheck:

- **Finding 1:** the product transition is now coherent.
  - A step within 5% is proposed automatically.
  - A larger step gets an offered same-exercise trial, and success gives a provisional floor target.
  - A failed trial keeps the baseline and feeds the plateau rule.
  - A bodyweight start has its own branch, with no percentage applied to zero.
- **Finding 3:** the first-week example obeys the two-movement cap and reaches the hinge on visit 2. Calibration-only visits earn credit and advance the rotation. The 14-day return check no longer consumes a calibration slot.
- **Finding 10:** I recomputed all seven rows and they match: 28.2, 30.0, 31.3/33.2, 34.8/37.0, 41/51.5, 29.2/30.3 and 15.7 minutes.

## Remaining notes (none blocking)

**A. The no-feedback path through calibration needs one clause (`:40, 42`).** "Skipped feedback retains uncertainty", yet only a "manageable completed trial" supplies the provisional load. Evan's likeliest behavior is to skip the rating. State that a completed floor-rep trial with no difficulty report supplies the provisional load, and is never treated as Easy. Without a tap, the pace is still one load step per four to eight weeks, so the screen should say that Easy is the way to speed up.

**B. "Easy" reassessment needs a ceiling in its policy (`:42`).** It is allowed "at any stage", with up to three trial sets per movement. On coarse dumbbells that could be 40 → 45 → 50 → 55 lb in one visit on a self-report. The exercise-specific policy at `:116` should carry a per-visit cumulative cap for movements that are already established.

**C. The headline slightly oversells (`:9`).** By the plan's own model, B at ten sets is exactly 30.0 minutes and eleven sets is 31.3/33.2. Line 89 says this correctly; "about ten, eleven if measured times allow" would match it.

**D. The two-movement cap halves the first home day (`:67`).** Four floor-only checks cost about 40 seconds each. Letting the six-minute cap govern bodyweight checks would give a full first home session.

**E. Two small gaps.**
- The straight-set timing row (`:86`) omits the two within-block exercise changes, so it runs perhaps a minute low.
- A weighted lift at its ceiling whose coarse-step trial fails twice has no named end state. One clause would do: hold with an explanation.

## Evidence limits

- **Access:** document reading only. I verified no URL or source.
- **Parent's checks:** the ACSM, superset, push-up and Anatoly claims rest on the parent's and research agent's checks. That includes "sample doubles" at `:11`.
- **Companion docs:** I did not re-read them this pass. Compatibility is judged against my earlier reading, and their "remains open" status lines are now stale; that is the parent's maintenance.
- **Method:** no runtime, database, gym or clinical validation. The scripted cases are requirements, not passed tests.

## Initial Fable review — before revisions

Reading is done; here is the review.

# Adversarial review: TRAINING-PLAN.md

**Planning verdict: NEEDS REVISION.** Three blockers, each fixable with a paragraph-sized rule change.
**Build-readiness: NOT READY.** The plan says so itself (`TRAINING-PLAN.md:5,110`), and nothing in it promises live or clinical readiness.

**Orientation proof:**
- **Agenda:** ACTIVE is empty; Up Next is warm-up/plate verification, the nutrition test and the Start double-click.
- **Memory:** the Hank-shared Supabase boundary, momentum over perfection, and the rule to verify the phone flow in a real browser.
- **Canonical docs:** README and Implementation-plan still describe RPE-threshold progression. `calculateProgression` in `src/lib/progression.ts` has no caller, and `middleware.ts` only delegates to `updateSession`.
- **Working tree:** `TRAINING-PLAN.md` is untracked.

## Blockers

### 1. The 5% load cap makes load increases unreachable on almost every chosen exercise
`TRAINING-PLAN.md:55-56, 102-103`, against the exercise table at `:26-28` and the light start at `:40`.

A step of at most 5% needs a current load of 20 times the smallest step:

| Smallest step | Load needed before any increase is allowed |
|---|---|
| 5 lb dumbbell jump | 100 lb per hand |
| 2.5 lb dumbbell jump | 50 lb per hand |
| 5 lb on a bar (two 2.5 lb plates) | 100 lb total |
| 10 lb machine stack pin | 200 lb |
| Bodyweight start (split squat, dead bug) | never: 5% of zero is zero |

- **Counterexample A:** flat dumbbell bench at 40 lb reaches 2×12 twice, about seven weeks in. 45 lb is 12.5%, so it holds; rule 3 forbids more reps or sets, so it holds forever.
- **Counterexample B:** back squat calibrated light at 95 lb. Adding 5 lb is 5.26%, so it holds forever.
- **Scope:** the same applies to the dumbbell RDL (B's priority lift), incline bench, row, pulldown and goblet squat.
- **The plan's own fixture:** `:102` only works with 1.25 lb plates and a 12-rep barbell lift that is not in the rotation.
- **Why it blocks:** the plan cannot produce its stated strength progress, and in effect it breaks `GYM-EXPERIENCE.md:68` (no indefinite holding).

**Minimal fix:**
- At the ceiling, allow the next available increment with reps reset to the floor, issued as a provisional trial under the existing rule-5 revert.
- Define a bounded bridge for very coarse jumps, such as light dumbbells.
- Define the first external load for a bodyweight start.
- Label all of it a product heuristic.

### 2. A too-light start has no way up, and effort stays low by design
`:40, 42, 44, 54, 61`, with volume at `:36`.

Calibration starts light, forbids failure tests, and aims for "several reps available". The only upward path is +1 rep per two clean exposures, and each exercise appears about 1.5 times a week.

- **Pace from the range floor, with no misses:**
  - Squat (6–8): 6 exposures, about 4 weeks per load step.
  - Bench and RDL: 10 exposures, about 6.7 weeks.
  - Calf raise: 12 exposures, about 8 weeks.
- **No accelerator:** extras don't speed the gate, "too easy" has no effect, and a user-raised load is undefined.
- **Counterexample:** Evan calibrates squat at 95 lb when 155×8 was available. Even with blocker 1 fixed, reaching 155 takes roughly 48 weeks of 2×6–8 far from effort.
- **Evidence boundary:** the plan combines low volume, low effort and slow progression. The project's own report warns that combination is not validated (`research/anatoly-minimum-dose-2026-11-18.md:72`).

**Minimal fix:**
- While a prescription is provisional and no short set or "hard" report has occurred, let one clean exposure earn one bounded step.
- Define what a manual upward edit does to baseline and counters.
- Give the "initial return period" an exit condition.

### 3. First week and return-from-gap are undefined where calibration meets rotation and credit
`:42, 89, 91, 93`.

- **First week:** there are nine distinct gym exercises and a cap of two calibrations per visit.
  - Visit 1 calibrates squat and bench; the row is deferred, so block 2 is incomplete and A stays due (`:91`).
  - The hinge is not touched until visit 3 at the earliest, and a full template takes four to five visits.
  - Nothing says whether a calibrated exercise gets working sets that day, or what the first rep target is.
- **Return:** a home week plus two days puts every exercise in the due template at 14 days.
  - All five need "bounded calibration", but only two or six minutes are allowed.
  - If the cap applies, block 2 cannot complete and the template stays due while the other one ages further.
  - If it does not apply, the time budget breaks.
  - "No automatic detraining percentage" also leaves Evan choosing every load, against `GYM-EXPERIENCE.md:5`.
- **Credit:** attendance needs a "confirmed working set" (`:89`), and calibration sets are not working sets. A calibration-only first visit earns nothing.

**Minimal fix:**
- Add a traced first-week example.
- Separate a return check from first-use calibration: one proposed, labelled step-back per exercise that Evan confirms, outside the cap.
- Credit any confirmed non-warm-up set.

## Should fix in the same revision (not blocking alone)

4. **Partial-session rotation (`:91`).** "Next-visit work adjusted for what was actually performed" is undefined.
   - **Counterexample:** three visits each cut during block 2 give A, A, A: squat three times, hinge zero. Meanwhile block 3 can be skipped forever, and the split squat then re-enters the 14-day return loop every time it reappears.
   - **Fix:** advance when the priority lift's working sets are done, and surface repeated block-3 omissions.

5. **Going down requires answering a question (`:57-58`).**
   - **Counterexample:** Evan skips the context prompt and misses 10/8, 9/8, 9/7 indefinitely. The app keeps prescribing 2×10 and keeps asking.
   - **Fix:** after about three consecutive comparable misses with no discomfort or interruption flag, lower the target one rep regardless of cause.
   - **Related gap:** a failed trial loops 8, 8, 9-miss forever with no plateau rule.

6. **"Comparable" is undefined in the common cases (`:52`, `:32`).**
   - **Counterexample:** the pulldown is busy every other visit, so paired and straight days alternate and two consecutive comparable exposures never occur.
   - **Fix:** state which context changes still count, and whether an excluded exposure skips or resets the counter.
   - **Related gap:** a substitute load because the 40s are taken is also undefined.

7. **Correction after the trial was performed (`:59`, `:108`).** The example only covers an unstarted increase.
   - **Counterexample:** 2×9 was already completed 9/9, then the earlier 8 is corrected to 6. The baseline is now ambiguous.
   - **Fix:** actual performance at the higher prescription stands, and replay only changes unstarted work.

8. **Last-set extras do nothing (`:48`).** They don't speed the gate, and at the ceiling none are allowed.
   - **Counterexample:** "extras count toward meeting the target" could be read as 7 + 10 satisfying 8/8.
   - **Fix:** give extras a bounded role or drop the prompt, and state that every set must meet its own target.

9. **Volume cannot grow inside 30 minutes by the plan's own model (`:36`, `:79-85`).**
   - **Counterexample:** eleven sets is 28.7 min (A) and 29.8 min (B); thirteen is 31.8 and 33.0. The steady state is 10–11 sets against Evan's familiar 18–24.
   - **Second gate:** adding volume also needs an optional recovery answer, so declining it holds volume indefinitely.
   - **Fix:** state the 10–11 set ceiling plainly as Evan's decision, and say when the recovery question is asked.

10. **Timing assumptions (`:75`).** The arithmetic in all five rows checks out, including both sides and rests; the assumptions are optimistic.
    - **Counterexample:** A's 20-second transition includes a bench-angle change and a dumbbell swap. Using 40-second transitions and 2-minute block changes gives A 28.8 and B 30.0.
    - **Fix:** price transitions per pair, add a straight-set fallback rest, and add a home row (roughly 12–15 min by the same model).

11. **Exercise identity (`:22, 28, 65, 93`).**
    - **Counterexample:** the dead bug appears in A, B and home in three pairing contexts. One history progresses it every visit; three histories give three different targets for the same movement.
    - **Fix:** declare one, state the gym split squat's loading mode, and say whether left 8 / right 6 meets a target of 8.

12. **Home progression is inert (`:65-67`).** No starting-target rule exists for bodyweight work, and the two-exposure gate assumes regular use.
    - **Counterexample:** one home week yields 2×6, 2×6, 2×7 push-ups, even if Evan can do 25.
    - **Fix:** one submaximal check set to pick the target, a faster rep gate for bodyweight, or state that home is attendance and maintenance only. Add a home gap rule.

13. **48-hour and 6-hour rules (`:89-91`).**
    - **Counterexample A:** one squat set on Monday earns credit, then makes the app "avoid proposing" Tuesday's real session; what it shows instead is undefined.
    - **Counterexample B:** a 7 am partial and a 6 pm visit earn two credits in one day.
    - **Counterexample C:** work resumed 5.5 hours later counts as the same context with no re-warm-up.
    - **Fix:** one sentence each.

## Evidence boundaries

- **What holds:** the plan keeps heuristics separate from sources (`:11-18`), admits the missing pulling movement at home, and limits the push-up study correctly.
- **Unsupported detail:** "heavy doubles" (`:13`) appears nowhere in the supplied material or the research report.
- **Not source conclusions:** the 5% cap, the two-exposure gate, 14 days, 48 hours, 6 hours and every rep range are the plan's own heuristics. My fixes above are heuristics too.

## Questions only Evan can answer

1. Current injuries, recurring pain and excluded movements (still pending).
2. When they conflict: 30 minutes with about 10–11 sets, or 35–45 minutes for the familiar 18–24?
3. What are his gym's smallest plates, dumbbell steps and pulldown stack steps? Blocker 1's fix depends on it.
4. Does "based on Anatoly" mean barbell bench and deadlift belong in the base rotation? Only the squat is there now.

## Review limits

- **Sources:** I had no web tools, so the ACSM, superset, push-up and AnatolyFit claims rest on your checks and the repo's research files.
- **Method:** document reading and static code reading only; no runtime, database or gym test.
- **Validation:** nothing here is clinical validation.
