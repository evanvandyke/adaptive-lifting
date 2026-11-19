# Standalone Engine: Adversarial Review

2026-11-19 · America/Denver

**Final outcome: scoped PASS for the standalone candidate.** Fable 5.2 closed all reported specification/implementation findings and the final two follow-ups. The parent independently ran the final corrected candidate: **149/149 behavior tests and 44/44 scripted histories passed**, with no failures, cancellations or skipped tests. This is software-policy evidence, not clinical validation or a live-app integration verdict.

Scope: the standalone candidate defined in [ENGINE-SPEC.md](ENGINE-SPEC.md), with [independent cases](ENGINE-TEST-CASES.md). Production UI, authentication, database integration and real gym use are outside this review. Numerical policies are experimental; software conformance is not physiological validation.

## Final verification and limits

- Actual command: `npm run check:engine`, fresh compilation, exit 0. [Full output](engine/reports/verified-tests-2026-11-19.txt).
- 130 independently authored test functions plus 19 planner tests; 44 separate exercise-focused histories spanning 618 visits, 4,462 journal events and 1,285 projected sets.
- [Latest history report](engine/reports/SUMMARY.md) and [source manifest](engine/reports/verified-source-2026-11-19.json) identify the exact run, specification and compiled candidate. Parent verified every trace's run/hash/status against the manifest.
- App-wide TypeScript check exited 0. ESLint exited 0 with no errors and eight warnings for unused bindings/imports and one short-circuit expression; this is not a zero-warning lint claim.
- Fable's reviews were read-only. It inspected source and supplied code sections; runtime results came from the parent and independent test author. All reported blockers were repaired and checked; this is not a proof that no other bug exists.
- No live UI, authentication, database writes, real offline persistence or physical workout was tested or changed by the candidate. Fitness suitability and efficacy remain empirical questions for later use.

## Final narrow Fable closure

**Final scoped verdict: PASS. A and B both close, and I found no contradiction in the two changed sections.**

This rests on the supplied code plus my earlier full-source read. I executed nothing; the 2/2 regression result and the pending full-suite run are the parent's.

## A. Malformed issuance metadata: closed
- **The crash path is gone.** `dependencyIds` must now be an array of valid IDs, so the later `.some` on it cannot throw. An issuance missing it is rejected up front, and a set that references it stays pending.
- **Holes are covered.** Validation runs on the parsed copy, so a sparse array fails `validId` on `null`.
- **Engine-emitted prescriptions still pass.** `make()` always sets a non-empty `source`, the three booleans, `recoverySeconds` of 150 or 90, and `context` defaulting to `"paired"`.

## B. Declined unperformed restore step: closed
- **Trace with retained 20, established 15, restore 20 issued and not performed:** `declineIncrease` now returns 15 through `returnWork`, which substitutes 10 if 15 is gone. Without the flag it still returns 20.
- **No dead end after declining.** The unperformed 20 has no exposure, so the earned pair at 15 survives. Performing the declined 15 re-establishes the same key, and the next undeclined visit can offer 20 again under the existing gates.
- **Authority replay agrees.** The decline flag is part of the issued context, so the snapshot recomputes the same 15.

Two behaviours are unchanged and consistent with the spec:
- **Same visit:** a decline in the visit where the 20 was issued still gets the prepared-prescription hold, because that check runs earlier.
- **Partly performed:** a restore that already has policy work continues at 20, and a short there lowers the load as before.

Nothing here validates loads or progression for Evan. The standalone candidate passes this scoped review.

## Fable implementation recheck

This recheck closed the original findings and identified the final two notes addressed above. Its reference to a pending full run describes that earlier checkpoint; the parent subsequently completed the final verification listed here.

# Recheck: `implementation-snapshot-2`

**Verdict: PASS on the scoped recheck.** All listed findings (K1, K2, primary 1–6, the five secondaries) are closed by reading, and I found no broken repair. One unlisted validation hole remains from snapshot 1, which I recommend fixing before calling the candidate finished; it is not a broken repair, so it does not change the scoped verdict.

I executed nothing. The 147/147 and 44/44 totals are the parent's report; I did not open the copied report files this pass.

## Closure table

| Finding | Status | Where | How it closes |
|---|---|---|---|
| K1 sparse / non-plain JSON | Closed | `util.ts:11-13`, `journal.ts:37` | Holes serialise as `null`, validation runs on the parsed copy, and non-plain prototypes throw. A sparse `dependencies`, `targets`, `stopEventIds` or `plannedIdentities` is now rejected, not accepted and dropped. |
| K2 resolved logical losers | Closed | `journal.ts:197-215, 264-267, 284-286, 342` | A losing candidate and its descendants go to `invalid`, which is filtered out of `pendingEventIds`, so the pending hold no longer fires after resolution. |
| 1. Easing from actual load, unbounded | Closed | `prescription.ts:173-190, 107-126` | Shorts require `setMatchesIssue`, easing uses the issued load with `have()`, and work is bound to the root's remaining slots and `workingSetBudget`. Once the slots are used the decision is a hold. |
| 2. Return mode dropped after partial/neutral visit | Closed | `evidence.ts:130-154` | The epoch latches on any return exposure with policy work, before scoring. Test F2 crosses the visit boundary for partial, time and equipment cases. |
| 3. Failed increase re-prescribed | Closed | `evidence.ts:166-168` | A short at the provisional's own key clears it. Traced D1 success, D2 short, D3 baseline success: D4 offers the baseline. |
| 4. Clock tolerance in issuance validation | Closed | `authority.ts:83` | The snapshot is replayed as of `e.occurredAt`, so a snapshot event no later than the issuance is not treated as future. |
| 5. Easy borrowing an old earned pair | Closed | `prescription.ts:307-312` | When Easy is the route, the gate uses the Easy set's own date and end time. |
| 6. Late records in snapshot closure | Closed | `authority.ts:76-78` | Closure admits only records received by the issuance, plus declared dependencies that had not yet arrived. A proof that was valid cannot gain a later-received member, so cached and cold agree for this case. |
| Secondary: `assessManualLoad` | Closed | `prescription.ts:72-77, 315-316, 324` | It needs a recorded matching actual and no longer triggers a load step alone; Easy, ceiling pair or first exploration is still required. |
| Secondary: `replay` skipped date check | Closed | `journal.ts:58` | The check moved into `validateEvent`, which both append and replay call. |
| Secondary: failed return check repeats | Closed | `prescription.ts:208-213` | A short at the current return load proposes the next lower entry, or `needs_calibration` if none exists. |
| Secondary: loads emitted without `have()` | Closed | `prescription.ts:108, 184, 194-199` | `make()` refuses any load not in inventory, and both prepared-hold paths check it. |
| Secondary: global migration latch | Accepted as declared | `ENGINE-SPEC.md:153` | The spec now states it is a global v1 boundary that voiding does not lift. |

The new replacement and budget mechanism is consistent across files:
- **Slot conflicts:** `journal.ts:158-168` maps replacement sets onto the root's logical slot, so an original and a replacement recording of the same slot conflict.
- **Extra work:** `make()` returns `working_set_budget_complete` on the `requestTrial` path after a completed root.
- **Planner:** completion counts slot coverage across root and replacements (`planning.ts:69-97`).

## Remaining items

### A. Unlisted, should fix: an issuance without `dependencyIds` crashes public replay
This was present in snapshot 1 and I did not list it then. It is the same class as K1 and contradicts "malformed issuance is rejected".

- **Cause:** `journal.ts:74-98` never checks `p.dependencyIds`, and `journal.ts:336` calls `s.issued?.dependencyIds.some(...)` outside any `try`.
- **Trace:**
  1. Apply a `prescription_issued` whose prescription omits `dependencyIds` (or carries a string). Validation passes. The authority check throws inside its own `try`, so the event is accepted as ineligible.
  2. Apply a `set_recorded` referencing that prescription ID, with matching visit, identity, role and start time. The structural projection attaches `issued`, then line 336 throws `TypeError`.
  3. The throw leaves `project`, `replay`, `appendEvent` and the public `applyEvent` uncaught. A stored journal containing both envelopes throws on public `replay` until the issuance is voided.
- **Precondition:** an envelope the engine itself never emits, so this needs an adapter bug.
- **Fix:** in `validateEvent`, require `Array.isArray(p.dependencyIds) && p.dependencyIds.every(validId)` and a string `dependencyFingerprint`.
- **Regression:** the two-event sequence above must return `rejected` on the first event and never throw.

### B. Minor, introduced by the return repair: `declineIncrease` ignored for an acknowledged but unperformed restore step
- **Cause:** `epoch.current` is the latest issued return prescription, performed or not (`evidence.ts:231-237`). `prescription.ts:233` returns it when its load differs from the baseline, before the decline and gate checks at `:234`.
- **Trace:** return check 15 established; next date a `return_restore` at 20 is issued and nothing is performed. On the following visit, `declineIncrease:true` still yields 20 as `return_reestablish`.
- **Impact:** small. The 20 was validly issued under every gate, and a short at 20 lowers correctly through `:209`. Only the decline flag is lost.
- **Fix:** when the current return load is above the established return baseline and has no exposure, honour `declineIncrease` by offering the baseline load.

### C. Behaviour notes, no action needed
- **Easy plus an old ceiling pair:** `requestTrial` with Easy today now holds for the day even when the old pair alone would have qualified. This is conservative and within spec.
- **Manual sets and the budget:** unissued manual working sets count against the visit's working-set budget, so logging one shortens the next issued prescription. Also conservative.

## Limits
- **Source read this pass:** `prescription.ts`, `evidence.ts`, `authority.ts`, `journal.ts` and `util.ts` in full; `planning.ts` only around completion coverage; the F1–F6 and secondary tests through line 1619.
- **Not re-read:** `types.ts`, `index.ts`, the scenario runner and the rest of the planner.
- **Runtime:** nothing executed. Every closure is a code trace, and items A and B are traces to reproduce, not observed failures.
- **Scope:** I checked only the listed findings and the code their repairs touched. This is not a second broad audit, and other defects may exist.
- **Clinical:** nothing here validates loads, progression rates or safety for Evan. The numeric policy remains an untested engineering hypothesis, and the candidate is not integrated with UI, database or persistence.

## Initial Fable specification review

Reviewer confirmed by execution result: `claude-fable-5-2`.
Session: `6a6e8684-de16-4c4f-b246-228023974294`.
Reviewed specification SHA256: `3f9a83f2cbc554a171d04ea553622682446035a69061a74b49ad654629be301f`.
The report below applies to that initial snapshot; its line references are historical.

# Adversarial review: ENGINE-SPEC.md (spec only, first pass)

**Verdict: NEEDS REVISION.** Seven blockers; each is a paragraph-sized rule or table. 1–2 are dead ends in the load arithmetic, 3–5 break determinism or the stop guarantee, and 6–7 are missing transitions or contradictions an implementer would have to invent. No unbounded upward load path found.

**Orientation proof:**
- **Agenda:** ACTIVE is the standalone engine candidate; UP NEXT is the Claude Design review, warm-up/plate check and nutrition test.
- **Memory:** shared Hank Supabase with `lifting_*` tables, momentum over perfection; the one feedback rule is real-browser phone verification.
- **Canonical docs:** README and Implementation-plan still describe the old RPE-threshold algorithm, as does `src/lib/progression.ts`; `middleware.ts` only delegates to `updateSession`.
- **Plan and review:** TRAINING-PLAN.md and its review read in full (planning PASS, not build-ready).

## Blockers

### 1. Starter loads and first-use ceilings fail the spec's own coarse limits
Catalog table `:29-37`, coarse table `:53-58`, `:45`, `:51`, `:62`.

- **No-feedback path:** press trial 5×8 with unknown feedback becomes provisional, then baseline at 5 lb. At 12/12 the next step 5→10 is 100% against a 25% cap, so it holds forever.
- **Every weighted row:** the starter load fails its own coarse limit on ordinary increments.

| Row | Starter step | Baseline needed before any step passes |
|---|---|---|
| Dumbbell press, row, RDL, goblet | +5 lb is at least 50% | 20 lb |
| Pulldown | 20→30 is 50% | 40 lb |
| Back squat | 20→25 is 25% against 15% | about 33.4 lb |

- **Easy is the only way out:** it must be ridden to the threshold before the second provisional success. Whether Easy on the establishing exposure counts as "before baseline" is undefined.
- **Lateral raise and added calf/split-squat load:** the first-use ceiling is 5 and the step is 2.5 (50%). Coarse-table row 4 can never be used.
- **Back squat:** the start cap of 20 makes it unreachable with a standard 45-lb bar, even via the goblet transition at `:41`.

**Minimal fix:**
- Let first-use step rules (catalog step, at most 100%, one step per date, two-date establishment) govern any load at or below the first-use ceiling, with or without a baseline; coarse and rolling limits apply above it.
- Update the 10→15 fixture to match.
- Raise the row 6–7 ceilings to 10, or declare them endpoints.
- State that A's priority lift is goblet squat unless a bar of 20 lb or less is verified.

### 2. Return mode has no exit
`:66`, `:90`.

- **Press:** baseline 20 after a 14-day gap returns at 15 (85% is 17). Getting back to 20 is a 33% step, so it fails the coarse cap and the visit anchor at `:51`.
- **Pulldown:** 40 returns at 30 and is stuck the same way.
- **Both readings dead-end:** it is unstated whether the gate re-establishes the return load or restores the retained baseline.
- **Also undefined:** the external-load return rep target and set count, a failed external return check, and a return when only a provisional prescription exists.

**Minimal fix:** after the return gate, propose one inventory entry per date toward the retained baseline, never above it, exempt from the coarse percentage; define the three missing cases.

### 3. Journal rules are order-dependent and incomplete
`:9-11`, `:98-102`.

- **Rejection depends on state:** a stale revision or stale visit is rejected in one arrival order and accepted in another, which breaks "arrival order never wins".
- **Revision race:** with 2a, 2b and 3→2a, the result is "stale, rejected" or "conflict" depending on arrival.
- **Acknowledgement:** it binds a "state revision", which differs per device.
- **Issued prescriptions:** they must survive replay (the 8→6 fixture needs this), but issuance is never defined as an event.
- **Event types:** none are enumerated.

**Minimal fix:**
- Add one event table: type, fields, preconditions.
- Reject only for intrinsic malformation; everything else is recorded as pending, conflict or ineligible.
- Have corrections reference the predecessor event ID; a non-tip sibling is always a conflict candidate.
- Derive proposal and issuance IDs from content.
- Make issuance a journal event; an issuance that fails the policy check is treated like an out-of-policy manual edit.
- Require replay to be permutation-invariant.

### 4. Time rules deadlock and leak
`:82-84`.

- **Deadlock:** one well-formed future-dated event (bad device clock) makes every later `now` "before an accepted event". Corrections cannot move dates, so the block is permanent.
- **Undefined terms:** "reversed timestamps" and any skew tolerance.
- **Distinct-day loophole:** visits at 11:55 pm and 12:05 am are distinct dates, so establishment or a return gate can complete in minutes.
- **Stale visits:** sets logged into a visit idle for six hours or more have no defined handling.

**Minimal fix:**
- Record events dated beyond `now` plus a stated tolerance as quarantined, without evidence, and add a void event.
- Define the ordering constraints within a visit.
- Require a minimum elapsed gap (for example 12 hours) between the two qualifying successes.
- Auto-close a visit at last activity plus six hours; later sets are recorded as ineligible.

### 5. The pain stop can be cleared by a side door
`:21`, `:74`, `:78`.

- **Correction bypass:** a correction that removes the pain flag replays to "no stop", skipping the explicit resolution and fresh preparation.
- **Retroactive flag:** a flag added after later clean work has no defined effect.
- **Scope:** the spec does not say whether the stop covers the set, the identity, sibling variants or the visit, or whether it persists across visits.
- **No resolution event exists.**

**Minimal fix:** latch the stop on any revision that ever carried the flag, per identity and across visits, until a typed resolution event references it; state whether sibling variants are blocked.

### 6. Evidence state machine has missing or circular transitions
`:66-76`.

- **Same-date veto loop:** an earned proposal is issuable at a "later exposure", so it can run the same evening. If it goes short, it vetoes the morning evidence that earned it. Fix: issuable only on a later training date, and any short, hard or pain exposure on a date vetoes that date regardless of order.
- **Difficulty never resets:** the plan's "success resets difficulty" was dropped, so three unknown shorts across a year trigger a reduction.
- **No cause field:** "effort-related" versus "unknown-cause" has no field in the actuals at `:17`.
- **Hard but complete:** skip, reset or difficulty is undefined, and so is how per-set feedback becomes exposure-level Easy or hard.
- **Extras:** every changed prescription is provisional, and extras are barred on "provisional variants", so the accelerator is either dead or establishes after one date. `min(2, extraActual)` changes nothing.
- **Rep bridge:** after 9/8 is established, "+1 each set" gives 10/9, skipping the 9/9 that failed and is still blocked.
- **Load hold:** it has no release condition.
- **Recovery compliance:** "shortened recovery" has no data source and no default when timing is unknown. Batch-logged sets either never progress or bypass the rule.

**Minimal fix:** one transition table covering these rows.

### 7. Three contradictions an implementer must guess at
- **Status:** `:11` says a trial is a proposal, but fixture `:127` returns `needs_calibration` with a trial. That status also covers missing rehearsal and no eligible load. Conflict and time-skew have no status. Add a status-by-payload table.
- **Rotation:** `:84` advances once per date. Morning A advances to B, evening B does not advance, and the next visit is B again. Key rotation to the date's template instead.
- **Volume:** `:94` adds one set per two exposures with no maximum, no named identity and no recovery-feedback event. Cap it (three sets, priority lift first).

## Nonblocking refinements
- **Ordered decisions (`:21`):** say that limits at step 6 suppress only trials and upward proposals, not existing working prescriptions.
- **Easy inversion (`:51`):** Easy helps only when the next step is over 5%, so finer increments are penalised.
- **Manual edits (`:78`):** "policy-eligible" should mean "issuable as a coarse trial right now"; the antecedent of "it never changes rolling anchors" is unclear.
- **Limit scope:** first-use caps are per visit while established caps are per date, and "three trials per identity" does not say per visit or lifetime. Say whether continuing calibrations count as "new".
- **Six-minute cap:** two identities at three trials each cannot fit with 90/150-second recoveries. Say whether a trial may start if it cannot finish, and whether same-visit working sets count as date one.
- **Day-42 cliff:** day 41 returns at 85%; day 42 restarts at the smallest implement. Out-of-policy heavier work also does not refresh the absence clock, so honest logging can trigger this.
- **Arithmetic:** nanograms times 125 exceeds the safe-integer range above about 158 lb; mandate BigInt or cross-multiplication. State lb limits for kg stacks.
- **Small definitions:**
  - validity window for a "current" rehearsal;
  - an established load missing from inventory;
  - which side sets the home-check target;
  - when absence mode is evaluated (freeze at visit start);
  - whether exactly 1800 seconds "fits" (B equals it);
  - how planner overhead changes when a block is dropped;
  - storing the derived training date instead of re-deriving it from tz data.

## Checked and clean
- **Bounds:** first-use chains across split visits and anchor resets stay under the ceilings; ratchets cannot reset the rolling anchor.
- **Timing:** the constants reproduce 940, 1690 and 1800 seconds.
- **Claims:** I found no clinical or persistence overclaim.

## Limits
- **Scope:** document reading only: ENGINE-SPEC.md in full, with TRAINING-PLAN.md and its review as context.
- **Not inspected:** `engine/` and ENGINE-TEST-CASES.md, as instructed.
- **Not done:** nothing was executed, no web sources were checked and no files were edited.
- **Nature of findings:** counterexamples are hand arithmetic against the spec's tables; nothing here is physiological validation.

## Implementation audit — first source snapshot

The full read-only audit command timed out after 900 seconds without returning a verdict. Its visible progress confirmed source had been read end to end. The same Fable session was resumed for a focused synthesis, which completed with exit 0 and confirmed model `claude-fable-5-2`. The report below is the resulting actual verdict, not an inference from the timeout.

The immutable input copy was `implementation-snapshot-1` under the parent's temporary review directory. It included the original 121-test/40-history validation log. Known sparse-array and resolved-loser fixes and the lower-manual-anchor repair landed after that snapshot. Later replacement-slot and return repairs are separate changes to be rechecked. The reviewer did not execute tests.

# Implementation audit: `implementation-snapshot-1`

**Verdict: NEEDS REVISION.** Both disclosed blockers are present, and I found six more defects that violate ENGINE-SPEC, three of them on load-authority or return paths.

**Limits:** everything below comes from reading `engine/src/*`, the scenario runner and parts of `independent.test.ts`. I ran nothing, so each finding is a code trace to reproduce, not an observed failure. The 121 tests and 40 histories do not reach these paths, for reasons listed at the end.

## Known blockers (confirmed present)

- **K1, sparse arrays.** `journal.ts:45` uses `.every(validId)`, which skips holes. `util.ts:11` then serialises a hole as `[,]`, and `JSON.parse` at `journal.ts:305` throws inside replay's catch. The event is reported accepted and silently dropped. The same pattern guards `stopEventIds` (`:70`), `targets` and `roles` (`:76-77`), `expectedCandidateKeys` (`:100`) and `plannedIdentities` (`:57`); fix them all.
- **K2, resolved logical losers.** `journal.ts:166-170` adds the losing candidate to `pending`, and `prescription.ts:64` then holds with `pending_reference_or_time` after the conflict is resolved.

## New findings, by priority

### 1. Short-set easing prescribes the actual load, with no policy or inventory check
`prescription.ts:128-137`.

- **Input A:** established press at 10 lb, issued 9/9. Record set 0 with `actual.load` 60 lb and 7 reps.
- **Actual A:** `make(short.actual.load, [8], "today_easier")`, a proposal of 60 lb × 8.
- **Input B:** baseline at floor targets, then an unissued manual working set at 60 lb with `feedback:"hard"`.
- **Actual B:** `lower(60 lb)` proposes the largest inventory entry below 60 lb.
- **Expected:** an out-of-policy actual "supplies no positive load authority".
- **Why it sticks:** the authority check recomputes the same decision, so the issuance validates and its sets become policy-eligible.
- **Also unbounded:** the `shorts.length===1` branch runs before the latest-issue checks, so after each completed easier set it proposes another one indefinitely.
- **Fix:** ease from the issued load only, require `setMatchesIssue` for the short set, check `have()`, and cap easing at the original prescription's remaining sets.
- **Regression:** both inputs must never yield a load above the issued one.

### 2. Return mode is dropped after a partial or neutral return visit
`evidence.ts:129-142` and `:196-207`.

- **Input:** baseline 10 lb, 15-day gap. Issue the return check at 7.5 lb and record only set 0 (or both sets with `cause:"time"`). Open the next visit three days later.
- **Trace:** set 0 is policy work, so the gap is no longer 14 days and the end-of-analysis block is skipped. The return exposure is neither a success nor a short, so the date loop hits `continue` before it creates the epoch.
- **Actual:** `returnMode` is false and the pre-gap baseline is offered, with any still-earned increase.
- **Expected:** the frozen epoch persists until two-date re-establishment.
- **Fix:** derive the epoch from the first issued return prescription with policy work, as `freshSince` is derived, not from scored dates.
- **Regression:** extend C68 across a visit boundary. The existing test only checks the same visit.

### 3. A failed increase is re-prescribed after one baseline success
`evidence.ts:144-158`; `prescription.ts:96, 208, 265`.

- **Cause:** `result.provisional` is set on a success at a non-baseline prescription and is never cleared when that prescription later goes short.
- **Input:** baseline 8/8. D1 9/9 succeeds, D2 9/9 goes short, D3 baseline succeeds.
- **Actual:** on D4 `existing` is the stale 9/9, issued again as `provisional_working`. This repeats after every baseline success, and the two-failure count never blocks it because that check sits only on other branches.
- **Load case:** the same trace applies to a provisional 12.5 lb that failed. It comes back as ordinary working sets without the rolling and date bounds being rechecked.
- **Expected:** return to established targets, with a bridge or terminal hold after two failed dates.
- **Fix:** clear `provisional` in the short branch when the key matches it.
- **Regression:** C40/C41 with one success before the failure.

### 4. Issuance validation ignores the spec's five-minute clock tolerance
`authority.ts:77-78`.

- **Cause:** the snapshot is replayed with no `asOf`, so "observed" becomes the latest receipt in the snapshot. The decision is then evaluated at `e.occurredAt`.
- **Input:** a device clock two minutes ahead, so every event has `occurredAt = receivedAt + 2 min`. Send `preparation_confirmed`, then issue.
- **Actual:** the last-received snapshot event has `occurredAt` later than observed, so it is treated as future and pending. `prescription.ts:64` holds, the issuance is marked ineligible permanently, and its sets carry no evidence.
- **Expected:** events up to five minutes ahead become ordinary once their occurrence time passes.
- **Fix:** pass `e.occurredAt` as the snapshot `asOf`.
- **Regression:** rerun one ordinary history with a constant +2-minute offset.
- **Confidence:** high on the mechanics. Every test and history sets `receivedAt === occurredAt`, so this path is unexercised.

### 5. Easy today can unlock a load trial in the same visit
`prescription.ts:220-224`.

- **Cause:** `qualifyingAt` prefers `earnedAt` over the Easy set's own time.
- **Input:** a baseline held at 8/8 (declined increases, or a plateau hold) with an old earned pair. Today's sets are completed with Easy on the last one, then `requestTrial` is sent in the same visit.
- **Actual:** `later` is computed from the old pair and is true. The trial at the next load is issued the same date.
- **Expected:** a later training date and 12 hours after the qualifying evidence, which here is the Easy exposure.
- **Fix:** take the gate time from the evidence that selected the route; when Easy is that evidence, use its end time.
- **Regression:** a same-visit request must return `increase_requires_later_date_and_12_hours`.

### 6. The snapshot closure pulls in late records, so cold and cached replay can disagree
`authority.ts:61-76` against the cache reuse at `:21-28`. Confidence: moderate.

- **Cause:** the closure adds any event in the whole journal that shares a visit ID, entity or referenced ID, with no receipt-time filter.
- **Input:** a valid issuance and its sets in visit V. Much later a second `visit_started` for V arrives under another entity, and the conflict is resolved in favour of the original.
- **Trace, cold replay:** the snapshot includes the late competitor but not the later resolution. It sees an unresolved conflict and marks the old issuance invalid.
- **Trace, cached path:** the stored proof is kept because the addition was received later.
- **Actual:** the two paths differ, and cold replay retroactively erases an originally valid issuance.
- **Expected:** identical projections, and a later record flags but does not erase.
- **Fix:** limit closure additions to records received at or before the issuance, plus its declared dependencies.
- **Regression:** assert cached and cold results are deeply equal after a late logical fork and its resolution.

## Secondary findings

- **`assessManualLoad` bypasses evidence gates** (`prescription.ts:228, 234-236`). It never checks that the manual load was recorded.
  - Before a baseline, passing the next inventory entry yields a trial with no Easy.
  - With a baseline, two ordinary successes below the ceiling yield a load trial.
  - Step bounds still apply; the evidence gate is skipped.
- **Public `replay` skips the training-date check** (`journal.ts:317` against `:297-313`). A mismatched stored date is rejected by `applyEvent` but accepted on rehydration, which weakens the distinct-date gates.
- **A failed return check repeats the same load on every later visit** (`prescription.ts:144-154`). The branch returns before the difficulty logic, and the spec requires the next lower entry or deferral.
- **Several routes build prescriptions without `have()`**: frozen return check load, `return_reestablish`, `easier`, `rep_bridge` and `calibration_fallback`. After an inventory change they can prescribe an entry that is no longer available.
- **Global migration latch** (`prescription.ts:48`). One foreign-zone or unknown-version envelope in raw events returns `needs_migration` for every identity, and a void cannot repair it. This may be intended; say so in the spec if it is.

## Checked and consistent
- **Planner arithmetic:** reproduces 1690, 1800 and 940 seconds, and the trimming order matches.
- **Load arithmetic:** unit normalisation is exact.
- **First-use bounds:** the ceiling, visit and rolling limits hold on the Easy route.
- **Stop latch:** it reads raw events, so corrections, voids and conflict candidates cannot clear it.

## Why green totals miss these
- **Clocks:** every fixture uses zero skew between occurrence and receipt.
- **Histories:** each drives one identity per visit, with full completion in return modes and 1800 seconds remaining.
- **Manual 60 lb cases:** C33 and history 21 use calibration role or full reps, so they never reach the easing branch.
- **Weak assertions:**
  - C38 accepts any prescription or a stop and does not check load.
  - C09 only asserts "not calibration".
  - C66 accepts either outcome.
- **Attainable-load invariant:** it runs only on scripted paths, where inventory never changes under a provisional or return load.
