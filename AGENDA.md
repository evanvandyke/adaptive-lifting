# AGENDA: Adaptive Lifting

Before editing, read `~/.agents/project-template/_SPEC.md`, section "AGENDA.md".

## ACTIVE (one deliverable)

- **Project: Adaptive Lifting → Fix what Evan's first real Signal workout on his phone turns up.** Why: `/lift` is live but has only been run in a desktop browser; his phone, his hands and his reports decide what changes next. Plan: `Docs_Compressions/session-03-2026-11-19-signal-workout-built-and-live.md`

## UP NEXT (three slots total, including FOLLOW-UP)

1. **Project: Adaptive Lifting → Visual-verify warm-up sets + plate calculator.** Why: Both were integrated into `ExerciseCard` during the build but never confirmed in a real browser; screenshot-check them first because they're load-bearing gym UX.

2. **Project: Adaptive Lifting → Manually test the nutrition tracker.** Why: The protein page and dashboard protein card were built by a sub-agent and never hand-verified; confirm the quick-tap buttons and 7-day bar chart persist and render.

3.

### FOLLOW-UP

## FOR SURE (committed, unscheduled)

- **Project: Adaptive Lifting → Fix the "Start Workout" double-click.** Why: It sometimes needs a second click; suspected race where `router.refresh()` doesn't pick up the new workout on the first try.

- **Project: Adaptive Lifting → Test AI weekly analysis on real multi-session data.** Why: The `/api/ai/analyze` endpoint works but has only seen synthetic input; verify it once Evan has logged a few real workouts.

- **Project: Adaptive Lifting → Confirm the plank completion counter updates in real time.** Why: A sub-agent fixed `ExerciseCard` but the integration was never verified end-to-end.

- **Project: Adaptive Lifting → Build progress photos: camera upload + gallery scroll-back.** Why: The one planned feature from the original spec that was never built; visual proof beats scale weight.

## IDEAS (maybe / someday)

- **Project: Adaptive Lifting → Graduate to the 4-day upper/lower split.** Why: The periodization planner already ships the advanced templates; flip to them when 3x/week full-body stops driving progress.
