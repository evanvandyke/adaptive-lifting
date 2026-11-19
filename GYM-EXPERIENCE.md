# Adaptive Lifting: The Gym Experience

2026-11-19 · America/Denver · Product brief for adversarial review

**The app makes the workout decisions. Evan shows up, lifts, confirms what happened, and leaves.** The goal is strength progress with manageable training and minimal phone attention.

This request authorizes a write-up and adversarial review only. Programming, calibration limits and adaptation mathematics remain build blockers. A prototype, gym trial and wholesale rebuild each remain unapproved.

## What Evan has established

- The app chooses the next session, exercises, loads and reps. Evan wants to know the session focus and approximate duration, rather than plan each gym visit.
- Normal workouts should incorporate sensible supersets to save time. Pairing must fit the exercises and gym.
- Performance fluctuates. The app should respond to what Evan can do that day and carry useful evidence into future workouts.
- Evan recalled a normal workout's last set allowing extra reps and endorsed it as a useful proposed performance signal. Its role in BAU5's calculation remains unverified.

Proposed setup inputs are schedule, equipment and usual time allowance, editable later. A shorter-day override covers exceptions. The exact split remains open; its labels must describe the program honestly.

## Evidence and its limits

The fifteen BAU5 screenshots supplied November 19 are numbered in arrival order. They document a walkthrough, not lifts Evan necessarily performed now.

| Evidence | What it establishes |
|---|---|
| Screens 1–2 | Historical Upper A, dated January 18, 2024, shows 35:03, connected exercise groups, warm-up/work-set sections and a cable-row capstone entry of 4+1 reps at 110 lb. A 122 lb one-rep-max label is visible; its derivation is unknown. |
| Screens 3–7 | A workout-expired message says weights were refreshed. Lower B previews 1h 5m and includes upper-body exercises. Expanded squat details show 3+ trial sets and a demonstration. The start preview shows 28+ sets and a 45 lb bar. |
| Screens 8–13 | Active sets show prescribed weight, editable rep counts with −/+ controls and deliberate slide-to-finish completion. The sequence shows 45 lb/14 reps, then 95 lb/13, then 115 lb/6, with upcoming setups visible during rest. A problem menu includes equipment, weight, discomfort, skip and end actions. |
| Screens 14–15 | A confirmation reports topping out at 115 lb × 4, with Confirm or Retry next time. The next screen advances to Romanian deadlifts at 45 lb/20 reps; the displayed total changes to 27+. |
| Evan's recollection, 04:46 MST | In normal workouts, the last set permits extra reps beyond the recommendation. He qualified this with “if I remember right,” then endorsed using that result as a performance signal. |

The trial screens show rep-adjustment controls and deliberate completion. The decrement from six to four is not captured; the four-rep confirmation is visible. Applying this interaction to normal sets is our proposal. The calibration formula, causal inputs and timer auto-start behavior remain unknown. Historical duration versus trial estimate is not a controlled comparison. Normal supersets rest on Evan's account and visible grouping. Lower B's mixed exercises suggest emphasis rather than isolation; that is an inference.

The [BAU5 report](research/bau5-adaptation-2026-11-18.md) and [training report](research/anatoly-minimum-dose-2026-11-18.md) predate these screenshots; this evidence updates their UI uncertainties, not the unknown algorithm.

## The proposed ordinary workout

| Moment | What the app does | What Evan does |
|---|---|---|
| Open | Shows next due session, approximate duration and Start. Resumes an unfinished same-visit workout; stale visits use the confirmation below. | Starts, resumes, or makes an occasional time/equipment adjustment. |
| Prepare | Shows one exercise, working weight, target reps and exact equipment setup. Warm-ups are clearly distinguished. Demonstration is available on demand. | Sets up and gets ready. |
| Perform | Keeps the current set and its numbers prominent. | Lifts. |
| Record | Shows planned values as defaults; the completion control names the actual count being confirmed. | Confirms “as planned,” or corrects weight/reps and completes the set. |
| Recover | Saves the result, starts the appropriate rest guidance and previews the next setup. Routes through the superset automatically. | Rests and prepares; can extend rest or pause. |
| Finish | Shows what was completed, a brief progress observation when justified, and the next session. | Leaves without completing a survey. |

One deliberate completion confirms each ordinary set; effort ratings are optional. Defaults become actuals only after confirmation. Large controls handle corrections. The proposed completion control includes undo; BAU5's swipe gesture is not yet selected.

Rest expiry means ready, not overdue. It does not log a set or pressure Evan into starting. Optional sound or vibration supports putting the phone down. Text, symbols and contrast communicate state alongside color; controls remain readable and usable with sweaty hands.

## The last set and initial calibration

**Last set:** before lifting, identify the target and the option for extra quality reps under a defined stopping rule. Use plain “Last set” language. Evan may finish at the ordinary target; remaining capacity then stays unknown. The completion control makes the count visible before confirming; the app does not sense reps automatically. Extras can refine the signal; ordinary completion remains useful evidence. Growth is not attributed solely to final reps.

**Calibration:** BAU5's displayed ramp and topped-out confirmation are evidence of its onboarding approach. Our proposal is bounded, conservative calibration, potentially spread over multiple visits. Show that a load is provisional and allow finishing calibration later. Interruptions and discomfort end the relevant attempt without turning the result into a strength limit.

Before building calibration, define starting-load selection, eligible exercises, a form/effort stopping rule, maximum attempts, maximum time and the fallback when evidence remains insufficient. This brief supplies no unbounded trial-to-failure loop or automatic requirement to reach absolute failure.

## Adaptation must use confirmed performance

Keep the prescription and the outcome separate. Retain exercise and equipment identity, load and unit, rep target, confirmed reps, set role, order, rest context, superset context and relevant exceptions. “Stopped at target” leaves remaining capacity unknown. A lower rep count might reflect fatigue, discomfort, equipment or interruption; it is not automatically a measured limit.

Proposed exception default: ask at most once per exercise/event and carry that context through affected sets. Permit skipping; keep the cause unknown. A new event can change context. A direct discomfort control is always available: it pauses the affected movement and offers stopping or leaving it, without diagnosing an injury or treating discomfort as ordinary underperformance.

The proposed engine separates:

- **Today's adjustment:** choose the next appropriate prescription from confirmed results and context, within exercise-specific bounds and available weight increments. Explain a material change briefly.
- **Longer-term progression:** repeated confirmed completion of prescribed work across comparable sessions is positive evidence and can earn a bounded, explained increase under rules still to be defined. Declining extras or effort ratings alone cannot force indefinite holding. A difficult day is recorded without automatically replacing the baseline; repeated difficulty remains actionable.

Exact thresholds, rep/effort interpretation, estimation formulas, deload criteria and change limits remain to be specified and tested. Unknown remaining capacity does not erase confirmed completion. Ambiguous interruptions favor holding or conservative adjustment rather than an unsupported increase. Calibration, warm-ups, interrupted sets and altered superset conditions must not silently become comparable strength tests.

The prescription must populate the next set/workout. Corrections have three boundaries:

- **Completed sets:** preserve the prescription as issued and version the editable actual result. Downstream completed sets retain their records and gain a context flag if their prescription relied on corrected data.
- **Current prepared/started set:** keep its displayed load stable. A changed proposal requires explicit acknowledgement before lifting; work already performed remains actual history.
- **Unstarted future work:** recompute guidance from corrected evidence, preventing duplicate sets or retroactive prescriptions.

## Supersets, exceptions and time

The app selects and routes pairings considering muscle overlap, fatigue, technique, equipment proximity and availability. Straight sets are an easy fallback, with the rest guidance and estimate recalculated.

Swapping an exercise retains the completed work and gives the replacement its own history and calibration status. Similar movement patterns do not imply identical working weights. Changed order, rest or grouping remains visible to the adaptation logic.

Label time as approximate, including calibration, warm-ups, sets, rest, transitions and an allowance for unknown equipment waits. Update it from actual elapsed time and plan changes. When Evan has less time, propose a shorter sequence while retaining required preparation and rest. If the budget is insufficient, offer an approved shorter alternative or ending early. Minimum-session rules need programming specification.

Session selection follows the completed rotation and local time, with a same-visit boundary still to be defined. An ongoing visit crossing midnight keeps its identity. Resuming automatically is limited to that same visit.

For a stale unfinished visit, propose closing prior work as partial and show the next proposed session, with one clear confirmation. Never merge visits or auto-complete unlogged sets. Ending early likewise preserves confirmed work; unconfirmed sets remain unrecorded, not failed. Optional backfill permits correcting an omission without a mandatory exit form. Partial-session rotation and inactivity boundaries belong in the programming specification.

After a long gap, explain and confirm a return plan while preserving history. Long-gap thresholds, preparation changes and discomfort follow-up remain explicit programming decisions.

## Trust and continuity

The gym flow should work without a live AI response. Prepare the session for offline use before starting. Each confirmed set must be durably saved locally before reporting local success; cloud synchronization has its own visible pending/saved state. Failed local persistence must be visible rather than disguised as a completed save.

Reopening restores the current exercise, confirmed sets, corrections and rest state. Retries and repeated taps have one logical effect. Offline edits synchronize without duplicate sets or silently restoring an older value. If a prepared plan is unavailable offline, explain that limitation before promising a workout. These are target behaviors; storage architecture is undecided.

## Existing foundation and scope

Static source inspection shows that [workout creation](src/app/(protected)/workout/actions.ts) seeds weights from the latest completed sets; workout completion stores progression advice as text. The separate `calculateProgression` function in [progression.ts](src/lib/progression.ts) has no caller in the inspected `src` tree. This path does not yet apply the intended adaptation. Current workout creation and lookup use UTC dates (`actions.ts:15,345`); meeting the local-time and same-visit requirements needs a targeted audit, not a presumed runtime outcome.

Default to retaining authentication, existing records and the shared Hank boundary (`lifting_*` tables). Warm-up and plate components are reuse candidates. Reuse excludes inherited numerical training rules, including bodyweight multipliers, time-off factors, 0.8 × estimated 5RM, 10% reduction advice and warm-up percentages; each requires fresh justification. A focused audit may justify targeted changes later.

Our scope proposal prioritizes one reliable guided workout and adaptation. Nutrition, photos, sharing and AI coaching remain unchanged in the existing backlog; reconcile priorities with Evan if this direction is approved.

## Acceptance walkthroughs

These define observable product behavior. A proposed desk walkthrough can use visibly labelled sample data and scripted mock prescriptions to exercise interaction/state transitions. It cannot validate dose, adaptation thresholds, calibration fallback correctness or real duration accuracy. Those require defined rules and later validation.

| Scenario | Observable pass condition |
|---|---|
| Open after setup | One screen shows next session focus, approximate time and Start; zero routine planning choices are required. |
| Ordinary or corrected set | One completion stores the displayed/edited actual weight and reps once, retains the issued prescription and opens rest plus next setup. |
| Ordinary completion only | A fixture of comparable completed sessions with extras/ratings declined still reaches a bounded increase under the scripted rule. The next prescription uses it and displays the reason; missing extras alone never cause a permanent hold. |
| Last set: extra or ordinary | Target/optional extras are labelled before lifting. Completion displays the confirmed count. Declining extras stores remaining capacity as unknown rather than maximum effort. |
| Difficult day versus trend | Scripted histories show a same-day adjustment applied to the next unstarted set while retaining the baseline; repeated comparable difficulty can produce the separate trend response. Stored history distinguishes both. |
| Repeated short sets | A relevant context question appears at most once for the same exercise/event. Later affected sets inherit that context. Skipping stores unknown cause; a new discomfort event still has a direct stop control. |
| Weight/station unavailable | The equipment action offers an attainable load proposal or a replacement/straight-set sequence. Acknowledgement precedes the change; completed records persist and replacement history stays separate. |
| Offline close/reopen | A locally confirmed set reappears once at the correct exercise; pending cloud state remains visible and later synchronizes once. |
| Correction after later work | Correct set 1 after completing set 2: both issued prescriptions remain, set 1's actual is versioned, set 2 gains dependency context, and only future unstarted guidance recomputes. A current prepared load changes only after acknowledgement. |
| Rest expiry | Expiry displays ready; waiting or pausing records no additional set and infers no reps. |
| Less time/end early | A shortened proposal lists remaining work and revised approximate time, preserving required preparation/rest under the scripted policy. End saves confirmed work as partial; untouched sets have no actuals or failure marks. Backfill is optional. |
| Left without ending | A stale unfinished fixture proposes closing the prior visit as partial and shows the next proposal. One confirmation separates visits; no unlogged set is completed. |
| Midnight continuation | Crossing local midnight during the same visit preserves session identity, confirmed sets and the current position. |
| Long-gap return | A gap fixture shows the proposed return changes and asks for confirmation; old records remain and an unfinished visit is handled separately. |
| Calibration boundary | A scripted cap, discomfort or voluntary stop exits the trial loop with provisional status and displays the scripted fallback. Tests of real cap/fallback adequacy wait for the training rules. |

## Decisions before building

1. **Program fit:** establish Evan's realistic availability, usual session budget and equipment, then select the split, exercises and superset rules.
2. **Training/state rules:** define preparation and stopping rules, calibration caps/fallbacks, progression thresholds, available-load handling, partial-session rotation, same-visit/inactivity boundaries, long-gap return policy and discomfort follow-up. Progression must tolerate occasional logging errors or accidental over-confirmation through bounded changes and corroborating history. Review evidence and simulated histories before live use.
3. **Interaction validation:** after Evan's go, conduct a desk walkthrough of the scenarios using clearly labelled sample data and scripted mock prescriptions. Because its fixtures are scripted, the desk walkthrough may precede program and numerical-rule decisions. Measure actions, corrections and state recovery only. This write-up does not authorize building that prototype. A real gym trial requires separate approval after the program and limits are defined; sample weights are never presented as lifting prescriptions.

The proposed next step is that desk walkthrough. Its results can inform a capability audit and reuse decisions. Actual timing accuracy and training-rule validity require later testing; visual identity is a separate decision.

## Research boundary

Low-dose training produced strength gains under particular conditions in [trained men](https://pubmed.ncbi.nlm.nih.gov/31797219/); that does not establish Evan's exact minimum. [Proximity-to-failure research](https://pubmed.ncbi.nlm.nih.gov/38970765/) is exploratory and does not make every last set a required failure test. [Autoregulation research](https://pubmed.ncbi.nlm.nih.gov/35038063/) found similar average strength gains in the included comparisons, rather than validating this proposed algorithm. The prior research did not establish an Anatoly-specific 80/20 method. Numerical prescriptions require their own justification.
