# Adaptive Lifting: Program Direction

2026-11-19 · America/Denver

Companion to [the gym-experience brief](GYM-EXPERIENCE.md). This records Evan's program preferences and the bodyweight fallback he approved for the design. It specifies product behavior, not a finished training prescription. The [draft training plan](TRAINING-PLAN.md) now proposes exercises, progression rules, calibration boundaries and timing; these remain proposals rather than implemented or personally validated prescriptions. Its separate [review record](TRAINING-PLAN-REVIEW.md) distinguishes the new planning review from the earlier gym-experience review.

## Confirmed with Evan

- On November 19, Evan reported no injuries and described himself as basically starting from zero. Establish current strength and work capacity through the initial sessions; historical lifts and workload are not current baselines.
- Plan around three sessions per week, advancing by visits rather than fixed weekdays.
- Target approximately 30 minutes. Evan's reference is six exercises in three superset pairs, repeated for three or four rounds: 18–24 working sets. This is his familiar workload, not a guaranteed starting prescription or duration.
- Design the primary experience for a full gym. Prefer free weights; use machines when better suited to the training objective and circumstances.
- Include a small, curated bodyweight fallback for a day or week without gym access.
- Use the same guided workout interaction in both settings. Bodyweight progression adjusts reps and, when appropriate, exercise difficulty; each variation retains its own history.
- Home sessions count toward the three-session goal. Their results do not automatically change gym lifting weights.

## Planning defaults

The 30-minute budget includes preparation, warm-ups, work, rest and transitions. Select the workload to fit approximately; retain appropriate preparation and rest when reducing work. Six exercises and four rounds are not compulsory for every session.

The first home option assumes no equipment. A supported surface or other item counts as an equipment requirement and must be available before an exercise using it is offered. Push-ups and air squats are Evan's examples, not a completed exercise menu. Exact variants, pairings and rep ranges belong in the training specification.

Use a curated menu with explicit movement coverage. When available exercises cannot cover a planned movement, show the omission briefly and choose a coherent reduced session. Do not label a different movement as an equivalent replacement simply to fill six slots. Initial fallback scope excludes an unrestricted exercise generator, improvised anchors and automatic conversions between bodyweight effort and pounds lifted.

## Switching between gym and home

These are proposed defaults to carry into the training specification and its review.

1. **Ordinary opening:** show the next gym session and Start, with a secondary “No gym today” action. The default path needs no daily equipment questionnaire.
2. **Choose home:** show the prepared home alternative, approximate duration and any coverage limitation. Starting it records the selected setting. The same prepare, lift, confirm and rest flow follows.
3. **Stay home for several visits:** offer “Use home workouts until I switch back.” Show the setting on subsequent previews with a direct “Back to gym” action. This avoids repeating setup during a week away; it has no automatic calendar expiry.
4. **Keep visits separate:** choosing a setting must resolve any ongoing or stale visit under the existing resume/partial-session rules. Confirmed work persists; changing setting never erases it or creates a second attendance credit for the same visit.
5. **Return to gym:** retain the next due gym session and its exercise histories. Home visits advance the home sequence; they do not mark unperformed gym sessions complete. The next gym preview identifies what is due.
6. **Account for elapsed time:** assess return guidance from time since each gym exercise was performed, plus relevant recent training and discomfort context. A home attendance streak does not establish recent practice of a barbell lift. Preserve historical loads; any revised prescription uses the separately defined return rules and explains the change.

The training-plan draft proposes a repeatable home template and partial-session advancement rules. The product requirement is that repeated home visits produce an appropriate next session without a growing backlog of missed gym workouts or instructions to cram them into the week.

## Bodyweight adaptation

Track exercise variation, setup, target reps and confirmed reps separately. When reps are per side, make that unit explicit. Record bodyweight exercise as a distinct loading mode, so an absent external weight is not mistaken for missing data or zero effort.

- **Within one variation:** use comparable confirmed sets to adjust the next rep target inside an exercise-specific range. Ordinary completion can support progression; extra final-set reps and effort ratings remain optional.
- **At the range boundary:** propose an eligible harder variation when the defined evidence threshold is met. Establish a provisional target for the new variation; do not carry the old rep target across automatically. Confirm the changed setup before lifting.
- **When the target is too hard:** offer a lower target or eligible easier variation under bounded rules. Preserve the distinction between a difficult day, repeated difficulty, discomfort and interruption.
- **When no suitable harder option is available:** explain the limit and retain an attainable prescription. Do not increase reps indefinitely, assume equipment or shorten rest merely to manufacture progress.
- **After an adjustment:** preserve issued prescriptions and actual results under the brief's correction rules. Completed work stays historical; only eligible future work changes.

The training-plan draft supplies the program direction; [ENGINE-SPEC.md](ENGINE-SPEC.md) now defines the isolated candidate's exact ranges, load-selection policies, progression, return handling and variation boundaries. Executable scenario checks and adversarial review evaluate that implementation; they do not establish physiological effectiveness. A harder variation is a new performance context, not a converted weight record.

## Progress reporting

Count each eligible home visit once toward attendance. The training-plan draft defines eligibility and distinguishes calibration/partial attendance from full-template completion. Show completed sets, confirmed reps and variation-specific progress for bodyweight work. Keep external-load tonnage and weighted PRs distinct.

A week at home must not trigger a fatigue/deload recommendation solely because recorded pounds lifted fell. Comparisons and AI summaries must identify setting and exercise changes, distinguish unavailable evidence from deterioration, and retain the actual work performed.

## Acceptance cases for the later walkthrough

These are requirements, not passed software tests. Numerical transitions use labelled scripted fixtures until training rules are approved.

| Scenario | Observable result |
|---|---|
| One home visit | “No gym today” produces a home preview; completing it adds one attendance credit and leaves the next gym session uncompleted and due. |
| A week at home | The persistent home setting offers the next home session without repeating setup; “Back to gym” restores the gym preview without catch-up workouts. |
| Ordinary completion only | Comparable confirmations with extras/ratings declined produce a bounded rep increase under the scripted rule. |
| Harder variation | A threshold fixture proposes the named variation and a provisional target; its records remain distinct from the previous variation. |
| Missing equipment or progression option | The preview excludes unavailable setups; an unavailable harder option produces an explained hold or eligible alternative, not an unbounded rep increase. |
| Incomplete movement coverage | The preview names the omitted movement coverage; no unrelated exercise is presented as an equivalent gym replacement. |
| Difficult or interrupted set | The confirmed result and context persist; future guidance follows the scripted rule without treating an interruption as a measured strength limit. |
| Return after time away | Return logic uses the last exposure to each relevant gym exercise; push-up performance does not overwrite the bench-press load. |
| Bodyweight-only week | Attendance and bodyweight work remain visible; zero external tonnage alone causes no fatigue/deload verdict or weighted PR. |
| Offline setting change | A prepared home alternative can be selected offline and survives reopening; an unavailable plan is explained before Start. |
| Setting change during unfinished work | Existing confirmed work remains attached to its visit; resume/partial handling prevents erased sets and duplicate attendance credit. |

## Next specification work

The standalone candidate's [verification results](ENGINE-RESULTS.md) and [review record](ENGINE-REVIEW.md) are complete for this iteration. Next, assess the Claude Design proposal and plan explicit UI/storage integration. Real equipment, movement checks and later gym use will establish Evan's personal loads and whether the experience fits. A software-policy pass is not evidence of training effectiveness or a completed live integration.
