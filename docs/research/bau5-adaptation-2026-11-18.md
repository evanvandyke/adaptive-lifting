# BAU5: What It Adapts, and What It Means for Adaptive Lifting

Research date: 2026-11-18 (America/Denver). This is a focused correction of the earlier report from the same day. No BAU5 app was installed or tested, so the public marketing and reviews below are not observed UX. This is not personalized training advice.

## 1. Design target: what Evan actually wants

Evan said all he needs to *know* is whether the session is upper or lower, and roughly how long it will take. He doesn't want to choose or declare either one each visit. Constraints (schedule, equipment, typical time available) are set once during setup. After that, the app decides the next due session and shows its time estimate. An optional override covers the exceptions, such as being short on time or finding equipment busy.

## 2. Public BAU5 evidence

**App Store listing.** The US, CA and AU pages are treated as one developer source.
- **Identity.** BAU5 Strength Workout Trainer (id 861552342), by Gym Futuristic, was the only lifting app found under that name. Evan should still confirm it's the one he used.
- **Description.** It says the app prescribes exercises, weight, reps and rest, and shows equipment setup. It lists a PRO feature, Smart Adapt, said to adapt to progress and performance. It recommends three workouts a week and claims "No data entry required".
- **Version history.** It names trial sets, a 1RM mini-chart, plate-setup preview, shorter warm-up rest, a rep speaker, and a proximity-sensor mode.
- The identity, description, Smart Adapt and three-per-week items were re-checked independently on 2026-11-18. The listing doesn't explain how Smart Adapt computes changes.

**Individual reviews on the same pages (paraphrased).**
- Howzat22 (AU, 2019-12-14): weight increments came with the paid version, and workouts ran longer than stated.
- Dave12547 (US, 2018-02-17): weight and reps both rose over time.
- hapa37 (US, 2017-08-25): one bench set at 185×12, then 245×6. That fits reactive adjustment, but equally fits a predetermined prescription that varies load and reps. It does **not** establish set-to-set response, or any link to trial sets.
- EmJay128 (US, 2022-07-18): unexpected resets back to trial sets.

**KDAWG blog (2014-10-17).** This is one user's experience with a 2014 version. It is historical anecdote, not current or universal behavior.
- The app gauged each exercise with trial sets pushed toward failure, which made the first sessions long; the blogger suggested budgeting about ninety minutes.
- Some routines leaned toward the upper body and others toward the lower body.
- It suggests calibration responded to performance, but doesn't document how.

## 3. Unresolved

- **Input mechanism: unknown.** "No data entry" is compatible with taps, a confirm/fail control, or automatic sensing. It doesn't contradict Evan's memory that the app adjusted to the reps he could do that day.
- **Exact adjustment rules: unknown.** These include how load and reps change, and whether that happens within a session or only at the next one. They also include how 1RM feeds loads, and how deloads or missed targets are handled. None of these were found in the sources checked.
- **Other gaps.** None of these were found in the sources checked:
  - who picks upper vs. lower
  - any time-budget feature
  - creator explanation, demo, or help docs

  Evan's version and tier (free or PRO, which years) are also unknown.

## 4. Repo findings

The code was read on 2026-11-18, with no live DB or browser test.

The app already has gym-floor aids. `WarmupSets` and `PlateCalculator` render in `src/app/(protected)/workout/components/ExerciseCard.tsx:116,134`. Onboarding calibration (estimated 5RM) is read at `src/app/(protected)/workout/actions.ts:80-83`. The gap is in adaptation:

- `createWorkout` seeds each set's weight from `lastWeights` (`actions.ts:63-67`, `129-139`). It falls back to calibration or bodyweight estimates only when there is no history (`73-121`).
- `completeWorkout` checks a fixed ≥5-rep target and the per-exercise average RPE, then upserts a **text** `ai_recommendation` (`actions.ts:264-286`).
- `getLastWeights` returns the most recent completed weight (`actions.ts:311-334`).
- `calculateProgression` (`src/lib/progression.ts:9`) appears only as its definition in a `src` search.

So these source paths don't apply an adaptive prescription day to day or at the next session. New workouts are *seeded* with the last completed weight. The workout card shows the first seeded set's weight (`WorkoutClient.tsx:196`), and the recommendation is stored as text. The dashboard computes its own displayed weights (`dashboard/page.tsx:163-224`), which were not reviewed here.

**Caveats.**
- The public evidence reviewed doesn't substantiate the following: the fixed 5-rep target, the repo's BAU5-specific thresholds, or its RPE attribution. That includes `progression.ts:29` and the "research-validated" wording in the docs. Historical docs don't prove current implementation.
- `progression.ts:30` says increments are halved during onboarding, but both branches at `32-34` are identical.

## 5. Product implications (proposals, not findings)

1. **The app picks the next due session.** It shows a realistic time estimate that includes setup and plate changes. An override covers low time, and a one-tap exercise swap covers busy equipment.
2. **Logging never invents data.** One "did as planned" tap confirms the planned reps at the planned load. Deviations get a quick reps stepper. Assumed reps are never saved as actual performance without the user confirming.
3. **Adjust from what actually happened.** Use the reps achieved at a known load, against a known target, along with the stopping context (stopped short vs. hit failure). One simple effort tap could be added. Whether that replaces per-set RPE is a friction trade-off to test, and the evidence doesn't settle it.
4. **Close the §4 gap.** Actually apply the next prescription in code. Cap changes, show a one-line "why", and never reset silently.
5. **Calibrate gradually** over the first few sessions instead of using a failure test day. The long-session anecdotes motivate this.

APRE (Mann et al., 2010; protocol in Mann, 2017) is one publicly described method that responds to reps. It adjusts loads from the reps completed on an all-out set. It isn't BAU5's formula or a chosen algorithm here. Its study population (college athletes) differs from a returning lifter.

## 6. One question for Evan

In BAU5, what did you tap or see immediately after finishing a set?

## Sources

1. Apple App Store, BAU5 Strength Workout Trainer (id 861552342): description, version history, reviews. Accessed 2026-11-18. https://apps.apple.com/us/app/bau5-strength-workout-trainer/id861552342 · https://apps.apple.com/ca/app/bau5-strength-workout-trainer/id861552342 · https://apps.apple.com/au/app/bau5-strength-workout-trainer/id861552342
2. KDAWG, "Fitness App Review: BAU5", *From Fat 2 Fit*, 2014-10-17. Accessed 2026-11-18. https://ff2f-kdawg.blogspot.com/2014/10/fitness-app-review-bau5.html
3. Mann JB et al., *J Strength Cond Res* 2010;24(7):1718-1723, doi:10.1519/JSC.0b013e3181def4a6. Accessed 2026-11-18. https://scholarship.miami.edu/esploro/outputs/journalArticle/THE-EFFECT-OF-AUTOREGULATORY-PROGRESSIVE-RESISTANCE/991031785742302976
4. Mann B., "Understanding APRE, Part 2", *Training & Conditioning*, 2017-11-08. Accessed 2026-11-18. https://training-conditioning.com/article/understanding-apre-part-2/
