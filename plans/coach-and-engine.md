# Coach and engine: burn-down

The live coach (`src/app/lift/coach/coach.ts`, 250 lines, 23 tests) is small on purpose. The parked engine (`engine/`, `docs/engine/ENGINE-SPEC.md`) covers far more cases and is connected to nothing. This list is the set of places where they differ or where the coach has a known gap. The first item decides how the rest are handled.

## The decision

- [ ] Keep the small coach and pull in engine ideas one at a time, or wire the engine in behind an adapter. Evan's call, after a few weeks of real workouts show which gaps actually bite. If the engine is adopted, it needs a storage adapter, a migration for existing visits, and its own real-phone run (`engine/README.md`).

## Where the coach is faster or looser than the written direction

- [ ] Progression speed: the coach adds a rep after one clean visit; earlier direction was two good days before going up (session 03 note).
- [ ] The third set arrives after two visits regardless of recovery; `docs/engine/TRAINING-PLAN.md` wants a fitting time estimate and manageable recovery first.
- [ ] Bench and incline, and the two rows, stand in for each other's starting weight; `docs/product/GYM-EXPERIENCE.md` warns similar patterns are not identical weights.
- [ ] Time away is judged by muscle group (85% after 14 days, 70% after 42); check that against exercise-specific history once there is real data.
- [ ] "Something hurts" holds the numbers and offers lighter or a swap; the engine spec keeps a caution on that lift across visits.
- [ ] A gym visit ended before half its sets does not use up its A or B turn; the plan documents count attendance by day.

## Gaps

- [ ] Home workout has a ceiling: bodyweight lifts stop at the top of the rep range with no harder variation offered, and there is no pulling movement at home. Say so on screen, or add variants.
- [ ] Starting weights and weight steps are fixed guesses (goblet 20 lb in 10s, dumbbells 15 lb in 5s, pulldown 40 lb in 10s). Let a person's real equipment and first tries set them.
- [ ] A movement skipped two visits running should move earlier in the visit.
- [ ] The four-day upper and lower split, for when three full-body days stop driving progress. The old templates were retired with the old app; this would be designed fresh.

## Evidence limits to keep in mind

- The research reports in `docs/research/` leave the reference app's exact adjustment rules unknown. Every number in the coach is a starting guess to tune, not a validated rule.
