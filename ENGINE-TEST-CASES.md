# Adaptive Lifting: Independent Engine Test Catalogue

Thursday, 2026-11-19 · America/Denver

**Reconciled to `ENGINE-SPEC.md`, policy `experimental-v1`, SHA256 `ee5a0e6ab9da9ad6b58ab3259bb71e4828c696bef199582418a70f32b2aa61c2`.** The 78-case first pass was prepared independently from `TRAINING-PLAN.md`, its review record, `PROGRAM-DIRECTION.md`, and primary-source checks before reading the engine specification. The specification was then read in full and its hash verified. Executable coverage is tracked separately below; catalogue membership is not a passed test. Parent owns implementation authorization, final policy decisions and commits.

The standalone engine must be deterministic and reproducible. Passing simulations establishes conformance to explicit software policy, not physiological safety, effectiveness, suitable starting loads, or readiness for a real workout.

## Final combined verification

The parent ran the final corrected candidate with `npm run check:engine`, exit 0: **149/149 test functions passed** (130 independent and 19 planner), with no failures, cancellations or skips. The separate **44/44 exercise-focused histories passed** across 618 visits. Run `adaptive-lifting-engine-K8Kcvn` is recorded in the [simulation summary](engine/reports/SUMMARY.md), [complete command output](engine/reports/verified-tests-2026-11-19.txt) and [source manifest](engine/reports/verified-source-2026-11-19.json). Fable subsequently closed the final scoped findings; see [review record](ENGINE-REVIEW.md).

The chronological checkpoints below preserve earlier failures and partial runs. Their references to pending repairs or future parent verification describe those earlier checkpoints, not the final status above.

## Independent requirements

| ID | Independent requirement |
|---|---|
| V01 | Separate unknown capacity, provisional prescription and established baseline. Never derive starting strength from bodyweight, historical maximums or unconfirmed targets. |
| V02 | Select attainable loads under a declared loading convention. Bodyweight zero, missing load and externally loaded zero must remain distinct. |
| V03 | Bound calibration by movement, visit time, trial count, absolute step and relative step. Define what happens at each exhausted boundary. |
| V04 | Ordinary confirmed completion progresses without mandatory ratings; absent feedback is unknown, never Easy. |
| V05 | Match evidence by movement/variation/setup/loading convention and required work. Per-side and per-set failures cannot be averaged away. |
| V06 | Optional extras have a bounded effect and never offset a short earlier set or enlarge a load step. |
| V07 | Separate small automatic load proposals from coarse-step calibration. Define eligibility, step limits, trial reps, first external load and an explained terminal hold. |
| V08 | Upward changes obey per-visit and rolling limits across all routes, including Easy, manual edits, retries and setting changes. |
| V09 | Distinguish difficult baseline work, failed increased trials, interruption and discomfort. Define no-feedback recovery and preserve repeated-trial failures across baseline returns. |
| V10 | Preserve original prescriptions and actual performance during corrections; only unstarted guidance is recomputed. Dependency flags cannot erase later successful work. |
| V11 | Replay is idempotent, ordered and revision-aware. Invalid/conflicting events fail explicitly, without partial state mutation. |
| V12 | Each logical exposure, progression gate, failure and attendance credit has an explicit unique identity. Creating multiple visits on one date cannot farm progression evidence. |
| V13 | Visit identity is distinct from dates. Local credit date and time zone are stable; rest/expiry/gap durations use elapsed time with an injected clock. |
| V14 | Exercise-specific absence drives return handling. Define which performed roles refresh exposure; a return check must not instantly unlock ordinary progression. |
| V15 | Partial visits, calibration-only visits and omitted movements have deterministic attendance/rotation/coverage outcomes. |
| V16 | Home work has explicit loading mode and coverage limits. Identical execution may share history, but different movements never convert performance into gym loads. |
| V17 | Prepared work changes only after acknowledgement. Offline retries preserve actuals and do not double-log. Persistence acknowledgement belongs outside a pure engine. |
| V18 | All policy thresholds are named/versioned. Outputs explain non-progression and expose missing prerequisites rather than guessing. |

## Policy reconciliation

The specification resolves the original twelve policy questions as follows. These choices are software hypotheses, not evidence of optimal training.

| Question | Explicit v1 resolution |
|---|---|
| Establishment and advancement | Two comparable provisional successes need distinct training dates and at least 12 hours between performance ends. They establish the prescription and may earn the next bounded proposal, itself only on a later date and 12 hours after its evidence. Consume the pair once; new-target counts start at zero. |
| Rolling anchor | Minimum of the established value active 168 hours ago and snapshots in the window. Before establishment, retain the first successful approved positive trial in that window through establishment. Provisional/Easy/mode changes never reset the anchor. |
| Coarse light increments | A target within the catalog low-load ceiling uses a controlled ≤100% AND absolute-step bridge, including established baselines; 10→15 can qualify below a 20-lb ceiling. Above ceilings normal dumbbell coarse limits are ≤25% AND ≤5 lb/hand; 40→45 can qualify. Rolling/date gates apply. |
| Unknown initial capacity | Rehearsal acknowledgement and verified inventory precede smallest positive entry at/below the catalog starter cap. No eligible entry gives an alternative or non-prescription. |
| No-feedback check | A completed floor trial without difficulty supplies a provisional prescription, never inferred Easy or baseline. |
| Absence refresh | Controlled, policy-eligible completed working/calibration actuals with at least one rep per required side, no pain/interruption; original performance time only. Warm-ups and out-of-policy edits do not refresh. |
| Same-day evidence | Aggregate once per identity/training date. Earliest complete eligible exposure supplies positive evidence; later eligible short/hard/pain vetoes that date. Separate partial visits cannot be combined. |
| Conflicting corrections | Preserve both competing candidates and block affected guidance; explicit resolution chooses a candidate. Unknown causal predecessors remain pending. Arrival order does not win. |
| Downstream corrected trigger | Retain later actual performance and issued targets with dependency flags; only unstarted guidance/counters recompute. Prepared replacement requires acknowledgement. |
| Time boundaries | ≥14 and <42 elapsed days: return mode; ≥42: first use. Inactivity ≥6 hours: stale; pause ≥30 minutes: renewed preparation. UTC elapsed durations, immutable configured training zone. |
| First added load | Added split/calf load uses starter cap 2.5 lb/hand, low-load ceiling 10 and step 2.5; no percentage of zero. |
| Two failed coarse trials | Explained hold/eligible alternative; smaller eligible step may differ from the failed target. Same-target retry needs two new full baseline exposures, recent manageable recovery and explicit request; one bounded retry retains failure history until establishment. Opening calibration alone clears nothing. For failed rep trials that both still meet all established targets without adverse flags, the next eligible date can offer a one-set bridge without another baseline-success pair; bridge establishment clears the superseded failures and then levels targets. |

Additional reconciled boundaries: ready trials use status proposal with kind calibration; missing rehearsal is needs_calibration without a prescription. Bodyweight/missing/external load remain distinct. Zero-rep attempts earn no attendance. Return freezes a retained pre-gap load and initial ≤85% inventory check, then uses two-date establishment and bounded restoration toward that retained load, never repeated85% reductions. Pain/control-loss in any revision or role, including a direct pre-set movement_stopped event, latches the movement family until referenced resolution plus fresh preparation. Direct stops create no actuals or attendance. Trusted receipt, frozen trainingDate, future quarantine/void, explicit volume recovery events, unknown-timing treatment and rep-bridge leveling are tested below. Unsupported versions/time-zone changes require migration; pure outputs make no durability claim.

## Coverage accounting

There are **78 named behavior cases**, not 78 multi-visit simulations. Some cases require multi-visit fixtures; test count and the builder's separately scripted history count must be reported independently. The independent executable suite will use public events/replay and concrete expected decisions. It must not seed internal baseline fields or reuse implementation formulas as an expected-value oracle. Each catalogue case will be mapped to executable assertions or an explicit integration exclusion/remaining gap after the public API is available.

## Fixtures and conventions

All weights below are sample test values, not Evan's prescriptions. A normal press fixture has a known setup, two required sets, range 8–12, and weight in pounds per hand. A baseline means its exact prescription is established. Unless stated otherwise, visits occur on separate local dates three days apart, required preparation/rest is met, no exception is flagged, and feedback is omitted. A target `8/8` means two sets, not left/right. Unilateral sides are written explicitly. A return boundary is measured from actual recorded exposure, not the current app date alone.

## Catalogue

### First use and calibration

| Case | Concrete conditions | Expected decision or invariant | Requirements |
|---|---|---|---|
| C01 | New press; no prior performance; available dumbbells 5, 10, 15 lb | With rehearsal/preparation ready, return proposal, kind calibration, trial5×8; no working baseline or profile-derived load. | V01,V02,V03 |
| C02 | New squat; only a 45 lb bar; no successful current rehearsal | Do not assert that 45 lb is manageable; propose an eligible rehearsal/alternative or defer under the defined selector. | V01,V03,V18 |
| C03 | New external-load exercise; empty inventory | Return a missing-equipment outcome, not fabricated load, zero pounds or nearest historical value. | V02,V18 |
| C04 | Weighted floor-target check at 10 lb reaches all 8 reps; rating omitted | Retain provisional 10 lb at 8/8 after the check; do not classify it Easy or establish baseline. | V01,V04 |
| C05 | Same check reports Easy, but next load exceeds permitted trial bounds | Show an explained hold/reassessment; Easy does not bypass load bounds. | V03,V07,V08 |
| C06 | Same check reports Too hard after 8 achieved reps | Veto upward trial and use an easier/deferred outcome; target completion does not override the difficulty report. | V03,V09 |
| C07 | First check reaches only 4 of floor 8; no earlier manageable check | Select an eligible easier option or defer; do not issue 8 at the failed load as established work. | V01,V03,V09 |
| C08 | Calibration completes three allowed checks; user reports Easy again | No fourth trial for that movement in the visit; preserve latest result and explain the limit. | V03,V08 |
| C09 | Six-minute visit calibration budget already exhausted before a new check | Defer further checks while preserving completed work and required rest. | V03,V15 |
| C10 | Two new gym movements already attempted; a third appears | Defer the third under the gym cap; do not silently count it as ordinary established work. | V03,V15 |
| C11 | Four home movement checks available; first needs an easier-variant retry | Retry consumes the shared home-check/time budget; cannot also perform four original checks plus the retry. | V03,V16 |
| C12 | Bodyweight check: floor 6, ceiling 12, actual 10 controlled reps | Provisional target becomes 8; preserve check role as calibration. | V01,V16 |
| C13 | Bodyweight check: floor 6, ceiling 12, actual 5 | No floor-clamped prescription of 6 unsupported reps; easier variant or defer. | V01,V16 |
| C14 | First external load for bodyweight split squat; old external load absent/zero | Use a dedicated first-load selector/calibration branch; no division by zero or percentage-derived load. | V02,V07,V16 |

### Ordinary progress and evidence quality

| Case | Concrete conditions | Expected decision or invariant | Requirements |
|---|---|---|---|
| C15 | Established press 40 lb, 8/8; one complete successful visit, no rating | Retain 8/8 pending the second ordinary success. | V04,V05 |
| C16 | C15 followed by another complete 8/8 at 40 lb | Propose 9/9 with count reset under the ordinary gate; no rating required. | V04,V05 |
| C17 | Target 8/8; actual 8/10 on an extras-eligible stable press | At most the same bounded +1-rep proposal; never larger load or +2-rep target. | V06,V08 |
| C18 | Target 8/8; actual 7/10 | No success through averaging or pooling extras; earlier short set matters. | V05,V06,V09 |
| C19 | Squat/hinge or return-check set has extra actual reps | Store truthful actuals; do not enable an ineligible extra-rep acceleration path. | V06,V14 |
| C20 | Target 8 per side; confirmed left 8/right 6 | Exposure is short; one stronger side cannot satisfy the target. | V05,V09 |
| C21 | Required two sets; first 8 completed and second unperformed because time ran out | No full-prescription success; preserve actual work and partial status. | V05,V15 |
| C22 | Required two sets; one set 8, second marked completed with no actual reps | Explicit invalid/incomplete result, not default-filled success. | V01,V05,V11 |
| C23 | Two successful paired exposures alternate with prescribed straight sets and adequate rest | Under the draft's comparability rule, straight-set substitution alone must not starve progression. | V04,V05 |
| C24 | A successful visit uses shorter-than-prescribed recovery or tagged unusual pre-fatigue | Exclude it from comparable success, with the specified skip/reset behavior, and retain actuals. | V05,V18 |
| C25 | Planned set count changes from 2 to 3 after prior 2-set success | Old success cannot complete the new-volume gate; preserve load/rep guidance and reset affected comparison count. | V05,V08 |
| C26 | Latest provisional increased prescription succeeds twice | Establish it once and permit the next future bounded +1 proposal using the same pair; the new target starts at zero successes. | V01,V04,V12 |

### Loads, coarse steps and manual records

| Case | Concrete conditions | Expected decision or invariant | Requirements |
|---|---|---|---|
| C27 | Established barbell load 100 lb, all ceiling reps twice, next load 105 lb | Eligible bounded automatic proposal at range floor, still provisional. | V02,V07 |
| C28 | Established dumbbell press 40 lb/hand, 12/12 twice, inventory 40/45 | Normal coarse controlled-trial branch above low-load ceilings, not a falsely ≤5% ordinary increase. | V02,V07,V18 |
| C29 | Light dumbbells 10→15 lb per hand, no smaller implement | Conditional low-load controlled trial because target15 is within the press ceiling20 and step5/50% fits the low-load branch; all date/rolling budgets still apply. | V02,V03,V07 |
| C30 | Next available load exceeds both coarse absolute and relative limits | Retain an explained attainable prescription/eligible alternative; do not propose the oversized trial. | V07,V18 |
| C31 | User repeatedly reports Easy on three visits close together | Every route respects cumulative increase limits; a new visit does not automatically reset the rolling anchor. | V08,V12 |
| C32 | Two upward trial requests in one movement/visit, with first already performed | At most the configured number of upward steps; repeated request is denied/explained without erasing actuals. | V03,V08 |
| C33 | User manually records 60 lb instead of prescribed 40 lb | Retain actual 60 and issued 40; do not schedule future 60 solely because it was typed. | V01,V08,V10 |
| C34 | Prescribed 40s unavailable; user records completed work with 35s | Use distinct provisional comparison context; 35s cannot complete a 40-lb success gate. | V02,V05 |
| C35 | Same exercise name, different machine stack identity or cable configuration | Separate load evidence and select/rehearse under the new setup; equal printed numbers do not imply equal load. | V02,V05 |
| C36 | Equivalent numeric values entered in pounds and kilograms | Normalize only under explicit unit policy; prevent 20 kg from being interpreted as 20 lb and apply increments consistently. | V02,V11 |
| C37 | Load inventory has duplicates, unsorted entries and one negative/NaN entry | Deterministic normalization or explicit rejection as specified; never select invalid or duplicate-created steps. | V02,V11 |

### Difficulty, exceptions and plateau

| Case | Concrete conditions | Expected decision or invariant | Requirements |
|---|---|---|---|
| C38 | Established 8/8; first set achieves 6, no cause supplied | Offer gentler unstarted work/more rest without requiring a rating; retain established baseline. | V04,V09 |
| C39 | Second set in the same exposure is also short | Propose ending that movement; count exposure difficulty once, not once per set. | V09,V12 |
| C40 | Increased 9/9 trial fails at 8/7 | Future exposure returns toward last established 8/8 unless current difficulty warrants gentler work. | V01,V09 |
| C41 | Same 9/9 trial fails, baseline succeeds, trial fails again | Failed-trial count persists across baseline return; enter plateau/reassessment branch. | V09,V18 |
| C42 | Baseline 8/8 has three separate comparable short visits, causes omitted | Produce a gentler provisional prescription under the unknown-cause rule; no indefinite repeat or diagnosis. | V04,V09 |
| C43 | Known effort-related baseline short visits meet their smaller threshold | Trigger reassessment once; preserve distinction from unknown-cause and increased-trial failures. | V09,V12 |
| C44 | Short set tagged equipment interruption | Retain result and exclusion; no strength-loss inference, difficulty gate or failed-trial accumulation from that event. | V05,V09 |
| C45 | Pain/discomfort arrives during an upward trial | Stop the affected movement path; no ordinary underperformance classification or automatic upward retry. | V03,V09 |
| C46 | Coarse trial fails twice at the range ceiling, with no eligible bridge | Explained terminal hold plus reassessment/alternative; no endless trial or unbounded rep ladder. | V07,V09,V18 |
| C47 | Two failed trials; user reopens calibration without new qualifying evidence | Failure history persists; entering a screen/mode is not successful recalibration. | V08,V09 |
| C48 | A genuine deliberate reassessment successfully establishes a new prescription | Clear only the relevant obsolete trial-failure history under an explicit rule; unrelated exercise history remains. | V01,V09 |

### Corrections and deterministic replay

| Case | Concrete conditions | Expected decision or invariant | Requirements |
|---|---|---|---|
| C49 | Earlier successful 8 is corrected to 6 before proposed 9/9 begins | Retract/recompute unstarted increase and affected success counts; retain original issued target. | V10,V11 |
| C50 | Same correction occurs after later 9/9 was actually completed | Preserve later 9/9 prescription and actual success, flag dependency, recompute only future guidance. | V10,V11 |
| C51 | Current set is prepared at 45 lb when a correction would suggest 40 lb | Displayed prepared load changes only through acknowledged change; pending proposal remains distinct. | V10,V17 |
| C52 | Same confirmation event ID is replayed twice after offline reconnect | One logical set, one result, one contribution to gates/credit. | V11,V12,V17 |
| C53 | Two different event IDs target the same set and same revision | Identical entity-revision payloads are one fact; competing payloads create explicit conflict and block affected guidance; never count two sets. | V11,V12 |
| C54 | Revision 2 arrives before stale revision 1 | Final state respects version order; later network arrival cannot resurrect stale values. | V10,V11,V17 |
| C55 | Events from two offline devices arrive in different permutations | Replaying valid equivalent event histories yields identical derived state or the same explicit conflict, not arrival-dependent progression. | V11,V17 |
| C56 | An event has unknown exercise/set reference or impossible date | Keep valid unknown causal references pending with no evidence; reject malformed IDs/dates without mutating valid history. | V11,V18 |
| C57 | Evaluation is called twice with identical immutable input, clock and policy | Identical result; input remains unchanged and no hidden wall-clock/randomness is used. | V11,V13,V18 |
| C58 | A completed set correction changes loading mode from weighted to bodyweight | Require a valid supported correction or reject; never silently convert weighted tonnage into bodyweight strength. | V02,V10,V16 |

### Visits, returns and home continuity

| Case | Concrete conditions | Expected decision or invariant | Requirements |
|---|---|---|---|
| C59 | Calibration-only A visit ends after one confirmed check | One attendance credit and advance gym rotation; baseline may remain unestablished. | V01,V12,V15 |
| C60 | Warm-up-only visit ends with zero confirmed non-warm-up work | No training credit or rotation advance under the draft; preserve warm-up record. | V12,V15 |
| C61 | Same exercise repeated in two visits on the same local date | Attendance remains one; evidence/failure counts once per identity/date, and later short/hard/pain work vetoes that date's positive evidence. | V08,V12,V13 |
| C62 | Visit starts 23:50 local, continues after midnight and ends 00:20 | One visit identity and original local credit date; no duplicate credit or mid-workout date reset. | V12,V13 |
| C63 | Six hours of inactivity pass without End; sets remain unconfirmed | Propose close-as-partial/new visit; never auto-complete or merge the next day's work. | V13,V15 |
| C64 | Same visit resumes after a 31-minute pause | Require renewed preparation/context before further work; retain confirmed sets. | V05,V13 |
| C65 | DST transition changes wall-clock labels during a visit | Expiry/rest/gap elapsed durations remain correct; local attendance date remains stable. | V13 |
| C66 | User changes display time zone after a visit has earned credit | Historical visit-start date remains stable; cannot mint another credit or duplicate success. | V12,V13 |
| C67 | Exercise last performed 14 days ago, but other exercises trained yesterday | That exercise enters return handling; recent attendance does not bypass it. | V14 |
| C68 | Return-check set succeeds and another working set remains today | Retain provisional re-establishment/no-extras state; no immediate ordinary upward jump just because the exposure clock refreshed. | V01,V08,V14 |
| C69 | Exercise absent 42 days; other movements are established | Only the absent identity enters first-use reassessment; existing unrelated baselines persist. | V01,V14 |
| C70 | User performs warm-up only for an absent exercise | Frozen return epoch remains required; warm-up alone cannot refresh absence or finish re-establishment. | V14,V15 |
| C71 | Three home visits while bench press remains unused | Credit home work, retain gym rotation due and bench history, apply bench's own absence clock. | V12,V14,V16 |
| C72 | Identical dead bug variation/setup completed at home then gym | One shared rep history under explicit context policy; no external-load conversion. | V05,V16 |
| C73 | Knee push-up changes to standard push-up | New variant calibration/target; old knee-push-up records remain distinct. | V01,V05,V16 |
| C74 | Home week has zero external tonnage but completed bodyweight work | No automatic fatigue/deload from zero tonnage; report actual home work and missing loaded-pull coverage. | V09,V16 |
| C75 | Two successive applicable visits omit a planned secondary movement | Coverage mechanism surfaces/repositions it without silently dropping it or forcing repeated priority work. | V15 |
| C76 | Offline home plan is unavailable when setting changes | Explicit unavailable-plan outcome before Start; no imaginary session or local-save success. | V17,V18 |
| C77 | A future event timestamp or system-clock reversal makes last exposure later than now | Block guidance explicitly for time skew; never let a negative gap unlock progression. | V11,V13,V14 |
| C78 | Policy version changes between old issued work and future replay | Return needs_migration for unsupported versions; preserve old issued records intact rather than speculate a migration. | V10,V11,V18 |

## Evidence boundary

The [2009 ACSM position stand](https://pubmed.ncbi.nlm.nih.gov/19204579/) described a 2–10% load increase when the current workload could be exceeded by one or two repetitions. That historical recommendation is not a universal 5% ceiling or validation of any proposed coarse-step exception. The [2026 overview](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/) favors individualization and does not establish this engine's calibration or exact effort thresholds.

The [NSCA/CSCCa transition consensus](https://www.nsca.com/about-us/position-statements/safe-return-to-training/) addresses collegiate athletes returning after inactivity, with upper limits during transition periods. It motivates bounded return handling but does not validate this app's 14/42-day thresholds or a specific percentage reduction for Evan. Public primary sources checked November 19, 2026. No exercise was performed and no clinical outcome was measured.

<!-- EXECUTION_LEDGER -->
## Executed independent behavior coverage

Checked 2026-11-19T15:48:34.171097+00:00. Fresh `test:engine` exit0. **99 independent named test functions passed; 78 catalogue IDs have executable assertions.** This is separate from the scripted multi-visit history count.
Compiled candidate SHA256: `23b635affc14f809a55f6ee76943f79e1e2803874d9a3a2f5af0774488a9351b`.
Specification SHA256: `ceed419ceb20159f32952237d49733fc5f702c590fbe7a737c8b2c533a50f965`.

| Catalogue case | Actual test function(s) | Outcome |
|---|---|---|
| C01 | [C01 initial verified press selects exactly 5 lb × 8 as calibration](engine/tests/independent.test.ts#L209) | PASS |
| C02 | [C02 unknown rehearsal never assigns an ordinary 45 lb bar](engine/tests/independent.test.ts#L218) | PASS |
| C03 | [C03 verified empty weighted inventory produces no fabricated load](engine/tests/independent.test.ts#L226) | PASS |
| C04 | [C04 no-feedback completed trial retains 10 lb at provisional 8/8](engine/tests/independent.test.ts#L234) | PASS |
| C05 | [C05 initial Easy cannot exceed first-use maximum step](engine/tests/independent.test.ts#L245) | PASS |
| C06 | [C06 completed floor with Hard feedback does not authorize upward work](engine/tests/independent.test.ts#L253); [C06 C07 failed higher calibration restores last manageable5 without immediate10 retry](engine/tests/independent.test.ts#L270) | PASS — strengthened follow-up |
| C07 | [C07 missed first floor with no prior manageable load does not establish work](engine/tests/independent.test.ts#L262); [C06 C07 failed higher calibration restores last manageable5 without immediate10 retry](engine/tests/independent.test.ts#L270) | PASS — strengthened follow-up |
| C08 | [C08 three calibration trials consume the movement allowance](engine/tests/independent.test.ts#L284); [C08 unrestricted Easy calibration cannot cross first-use ceiling before baseline](engine/tests/independent.test.ts#L297) | PASS |
| C09 | [C09 exhausted six-minute calibration budget blocks further trials](engine/tests/independent.test.ts#L310) | PASS |
| C10 | [C10 two new gym identities consume the visit calibration allowance](engine/tests/independent.test.ts#L318) | PASS |
| C11 | [C11 home retries consume the same four-check allowance](engine/tests/independent.test.ts#L328) | PASS |
| C12 | [C12 home controlled check 10 gives provisional target 8](engine/tests/independent.test.ts#L342) | PASS |
| C13 | [C13 below-floor home check cannot prescribe unachieved floor reps](engine/tests/independent.test.ts#L352) | PASS — strengthened follow-up |
| C14 | [C14 first added load uses 2.5 lb/hand selector rather than percentage of zero](engine/tests/independent.test.ts#L361) | PASS |
| C15 | [C15 C16 deliberate baseline hold preserves ordinary two-success progression](engine/tests/independent.test.ts#L412) | PASS |
| C16 | [C15 C16 deliberate baseline hold preserves ordinary two-success progression](engine/tests/independent.test.ts#L412) | PASS |
| C17 | [C17 extras accelerate at most one rep on a deliberately retained baseline](engine/tests/independent.test.ts#L422); [C17 C40 rep-only extras may advance a trial but never establish an intermediate target](engine/tests/independent.test.ts#L432); [C17 unknown timing permits ordinary evidence but cannot accelerate extras](engine/tests/independent.test.ts#L443) | PASS |
| C18 | [C18 7/10 cannot satisfy 8/8 by pooling extras](engine/tests/independent.test.ts#L452) | PASS |
| C19 | [C19 new variants and priority lifts never prompt extras](engine/tests/independent.test.ts#L377) | PASS |
| C20 | [C20 per-side calibration keeps weaker side decisive](engine/tests/independent.test.ts#L369) | PASS |
| C21 | [C21 time-limited partial does not supply full-prescription success](engine/tests/independent.test.ts#L460) | PASS |
| C22 | [C22 missing actual reps cannot become a confirmed completion](engine/tests/independent.test.ts#L388) | PASS |
| C23 | [C23 prescribed paired-to-straight change alone does not starve success](engine/tests/independent.test.ts#L468) | PASS |
| C24 | [C24 shortened recovery is excluded and does not establish baseline](engine/tests/independent.test.ts#L475) | PASS |
| C25 | [C25 changed required set count cannot reuse old two-set success](engine/tests/independent.test.ts#L482); [C25 requested ninety-nine working sets cannot bypass max-three volume guard](engine/tests/independent.test.ts#L494) | PASS |
| C26 | [C26 provisional two-success pair establishes and earns 9/9 only once](engine/tests/independent.test.ts#L401) | PASS |
| C27 | [C27 exactly five-percent bar increase uses the attainable 105 lb entry](engine/tests/independent.test.ts#L528) | PASS |
| C28 | [C28 established 40-to-45 uses an acknowledged floor-target coarse trial](engine/tests/independent.test.ts#L518) | PASS |
| C29 | [C29 established 10-to-15 uses bounded low-load trial inside catalog ceiling](engine/tests/independent.test.ts#L501) | PASS |
| C30 | [C30 oversized available step fails absolute and relative coarse bounds](engine/tests/independent.test.ts#L510) | PASS |
| C31 | [C31 rolling anchor remains 10 after 12.5 establishes inside seven days](engine/tests/independent.test.ts#L560); [C31 establishing 10 cannot ratchet a retained low-load rolling anchor of 5](engine/tests/independent.test.ts#L572); [C31 C33 lower manual calibration actual cannot reroot the rolling anchor](engine/tests/independent.test.ts#L882) | PASS |
| C32 | [C32 second upward load request in one date cannot chain Easy steps](engine/tests/independent.test.ts#L584); [C32 F5 Easy today cannot borrow an old earned pair for a same-visit load increase](engine/tests/independent.test.ts#L1544) | PASS — focused Fable follow-up |
| C33 | [C33 out-of-policy manual 60 lb actual remains truthful and non-authorizing](engine/tests/independent.test.ts#L871); [C31 C33 lower manual calibration actual cannot reroot the rolling anchor](engine/tests/independent.test.ts#L882); [C33 C38 F1 manual60 short or Hard cannot supply easing load authority](engine/tests/independent.test.ts#L1460); [C33 Fable secondary unrecorded assessManualLoad cannot invent reassessment evidence](engine/tests/independent.test.ts#L1585) | PASS — focused Fable follow-up |
| C34 | [C34 substitute actual load cannot satisfy original issued-load gate](engine/tests/independent.test.ts#L594); [C34 Fable secondary frozen partial-return load must remain attainable](engine/tests/independent.test.ts#L1616); [C34 Fable secondary return re-establishment cannot prescribe disappeared inventory](engine/tests/independent.test.ts#L1625); [C34 Fable secondary gentler future baseline chooses an available lower entry](engine/tests/independent.test.ts#L1632); [C34 Fable secondary rep bridge cannot reuse an unavailable baseline implement](engine/tests/independent.test.ts#L1643); [C34 Fable secondary failed calibration fallback checks current inventory](engine/tests/independent.test.ts#L1652); [C34 C38 Fable secondary remaining easing work cannot use a disappeared issued load](engine/tests/independent.test.ts#L1659) | PASS — focused Fable follow-up |
| C35 | [C35 machine setup identity cannot inherit another stack's trial](engine/tests/independent.test.ts#L905) | PASS |
| C36 | [C36 units normalize to exact distinct mass and preserve attainable entry](engine/tests/independent.test.ts#L915); [C36 maximum safe integer milli-unit input normalizes without floating-point loss](engine/tests/independent.test.ts#L925) | PASS |
| C37 | [C37 inventory sorting and duplicate entries do not invent load steps](engine/tests/independent.test.ts#L930) | PASS |
| C38 | [C38 short set offers gentler next work without a cause answer](engine/tests/independent.test.ts#L600); [C33 C38 F1 manual60 short or Hard cannot supply easing load authority](engine/tests/independent.test.ts#L1460); [C38 F1 easier sets stop when the original remaining work is completed](engine/tests/independent.test.ts#L1476); [C34 C38 Fable secondary remaining easing work cannot use a disappeared issued load](engine/tests/independent.test.ts#L1659) | PASS — focused Fable follow-up |
| C39 | [C39 two short sets end the movement and count one difficult exposure](engine/tests/independent.test.ts#L610) | PASS |
| C40 | [C17 C40 rep-only extras may advance a trial but never establish an intermediate target](engine/tests/independent.test.ts#L432); [C40 failed increased trial returns toward established prescription](engine/tests/independent.test.ts#L620); [C40 C41 F3 one success before a failed rep trial cannot resurrect that trial](engine/tests/independent.test.ts#L1507); [C40 F3 successful provisional load followed by failure needs renewed authority](engine/tests/independent.test.ts#L1521) | PASS |
| C41 | [C41 C47 repeated failed 9/9 survives baseline return and mode reopening](engine/tests/independent.test.ts#L628); [C40 C41 F3 one success before a failed rep trial cannot resurrect that trial](engine/tests/independent.test.ts#L1507) | PASS |
| C42 | [C42 unknown-cause short baseline dates eventually ease without a rating](engine/tests/independent.test.ts#L658) | PASS |
| C43 | [C43 effort-related baseline difficulty responds after two dates](engine/tests/independent.test.ts#L669); [C43 complete-but-hard is difficulty and a later clean success resets the streak](engine/tests/independent.test.ts#L678) | PASS |
| C44 | [C44 interrupted work remains actual history and does not establish baseline](engine/tests/independent.test.ts#L687); [C44 C70 controlled equipment or time truncation refreshes exposure but not progress](engine/tests/independent.test.ts#L696) | PASS |
| C45 | [C45 warm-up and out-of-policy actuals can stop work despite evidence exclusion](engine/tests/independent.test.ts#L708); [C45 pain correction false leaves family stop until referenced resolution plus preparation](engine/tests/independent.test.ts#L720); [C45 pain stops affected movement until explicit resolution and preparation](engine/tests/independent.test.ts#L942); [C45 direct movement stop before any set latches family without training credit](engine/tests/independent.test.ts#L734) | PASS |
| C46 | [C46 twice-failed permitted coarse load stops automatically repeating it](engine/tests/independent.test.ts#L544) | PASS |
| C47 | [C41 C47 repeated failed 9/9 survives baseline return and mode reopening](engine/tests/independent.test.ts#L628) | PASS |
| C48 | [C48 establishing a bridge clears only its superseded failed-proposal history](engine/tests/independent.test.ts#L642) | PASS |
| C49 | [C49 correction before further work retains issued target and recomputes guidance](engine/tests/independent.test.ts#L950) | PASS |
| C50 | [C50 correction retains successful downstream issued and actual work](engine/tests/independent.test.ts#L758) | PASS |
| C51 | [C51 old prepared prescription remains immutable when an earlier actual is corrected](engine/tests/independent.test.ts#L774) | PASS |
| C52 | [C52 duplicate offline event contributes exactly one set and one credit](engine/tests/independent.test.ts#L961); [C52 earlier trusted receipt on duplicate append converges with replay](engine/tests/independent.test.ts#L971) | PASS |
| C53 | [C53 duplicate logical set under another entity cannot become another set](engine/tests/independent.test.ts#L985); [C53 competing corrections produce conflict instead of choosing arrival order](engine/tests/independent.test.ts#L1005); [C53 explicit conflict resolution names exact candidate fingerprints](engine/tests/independent.test.ts#L1441); [C53 resolved duplicate visit loser and its descendants stop blocking guidance](engine/tests/independent.test.ts#L1157); [C53 resolved duplicate set loser and its correction do not count or remain pending](engine/tests/independent.test.ts#L1190); [C53 F1 original and replacement recordings cannot count the same planned slot twice](engine/tests/independent.test.ts#L1667) | PASS — focused Fable follow-up |
| C54 | [C54 revision three arriving before revision two remains pending then wins](engine/tests/independent.test.ts#L1017) | PASS |
| C55 | [C55 valid journal permutations yield identical projection and recommendation](engine/tests/independent.test.ts#L1031); [C55 JSON roundtrip of undefined optional fields creates no same-ID conflict](engine/tests/independent.test.ts#L1041); [C55 pending void revision cannot remove target evidence](engine/tests/independent.test.ts#L1222); [C55 competing void candidates cannot pick a target by arrival order](engine/tests/independent.test.ts#L1232); [C55 cached authority matches cold replay after equal-receipt correction and fork](engine/tests/independent.test.ts#L1056); [C55 F6 late logical fork resolution preserves original issuance in hot and cold replay](engine/tests/independent.test.ts#L1554); [C55 F6 declared causal records delivered later can restore a valid offline issuance](engine/tests/independent.test.ts#L1574) | PASS |
| C56 | [C56 duplicate logical visit under another entity is rejected or conflicted](engine/tests/independent.test.ts#L995); [C56 unknown valid references stay pending; malformed dates reject atomically](engine/tests/independent.test.ts#L1085); [C56 prototype property names are invalid catalogue variants without mutation or crash](engine/tests/independent.test.ts#L1098); [C56 malformed and non-cloneable public events reject before receipt override](engine/tests/independent.test.ts#L1113); [C56 sparse and non-plain JSON values reject atomically while dense references stay journaled](engine/tests/independent.test.ts#L1125); [C56 FinalA malformed issuance metadata rejects and its referenced set stays pending](engine/tests/independent.test.ts#L1707) | PASS — strengthened boundary follow-up |
| C57 | [C57 identical pure evaluations do not mutate inputs or change outputs](engine/tests/independent.test.ts#L1244) | PASS |
| C58 | [C58 correction cannot switch identity or loading mode](engine/tests/independent.test.ts#L1254) | PASS |
| C59 | [C59 calibration-only visit earns credit and advances gym A/B once](engine/tests/independent.test.ts#L1263) | PASS |
| C60 | [C60 warm-up-only or zero-rep visits do not earn attendance/rotation](engine/tests/independent.test.ts#L1271) | PASS |
| C61 | [C61 two same-date visits cannot earn two credits or advance rotation twice](engine/tests/independent.test.ts#L1280); [C61 two complete exposures on one local date cannot establish a baseline](engine/tests/independent.test.ts#L1288); [C61 later same-date short work vetoes earlier positive evidence](engine/tests/independent.test.ts#L1294); [C61 distinct local dates only twenty minutes apart cannot satisfy twelve-hour gate](engine/tests/independent.test.ts#L1301) | PASS |
| C62 | [C62 midnight continuation preserves one visit and original credit date](engine/tests/independent.test.ts#L1310) | PASS |
| C63 | [C63 exactly six hours of inactivity cannot resume as ordinary work](engine/tests/independent.test.ts#L1318) | PASS |
| C64 | [C64 exactly thirty-minute pause requires renewed preparation](engine/tests/independent.test.ts#L1325) | PASS |
| C65 | [C65 DST fallback uses elapsed UTC time and retains local visit date](engine/tests/independent.test.ts#L1334) | PASS |
| C66 | [C66 a different training-zone event cannot rewrite history's credit date](engine/tests/independent.test.ts#L1341); [C66 Fable secondary append and replay reject a forged frozen training date](engine/tests/independent.test.ts#L1594) | PASS |
| C67 | [C67 exercise absence remains independent of recent unrelated attendance](engine/tests/independent.test.ts#L785) | PASS |
| C68 | [C68 return check refresh does not cancel two-day re-establishment](engine/tests/independent.test.ts#L797); [C68 return load stays 7.5 across dates instead of repeatedly multiplying 85 percent](engine/tests/independent.test.ts#L808); [C68 F2 partial and neutral return visits retain their epoch across dates](engine/tests/independent.test.ts#L1491); [C68 Fable secondary failed external return check lowers the next visit or defers](engine/tests/independent.test.ts#L1605); [C68 Fable secondary one-set return remainder does not shrink the next visit template](engine/tests/independent.test.ts#L1693); [C68 FinalB declining an unperformed restore step retains the established return load](engine/tests/independent.test.ts#L1749) | PASS — focused Fable follow-up |
| C69 | [C69 forty-two-day absence restarts low-load selector while retaining history](engine/tests/independent.test.ts#L819); [C69 first-use check after long gap cannot resurrect archived baseline](engine/tests/independent.test.ts#L828) | PASS |
| C70 | [C70 warm-up only cannot refresh an absent exercise's readiness clock](engine/tests/independent.test.ts#L840); [C44 C70 controlled equipment or time truncation refreshes exposure but not progress](engine/tests/independent.test.ts#L696) | PASS |
| C71 | [C71 home visits preserve due gym rotation and unused press absence](engine/tests/independent.test.ts#L848) | PASS |
| C72 | [C72 identical dead bug execution shares history across home and gym](engine/tests/independent.test.ts#L862) | PASS |
| C73 | [C73 knee and floor push-ups retain separate calibration identities](engine/tests/independent.test.ts#L1350) | PASS |
| C74 | [C74 known home plan is 940 seconds and reports absent pulling coverage](engine/tests/independent.test.ts#L1359) | PASS |
| C75 | [C75 repeated planned omission is moved earlier while priority remains protected](engine/tests/independent.test.ts#L1371) | PASS |
| C76 | [C76 missing home plan equipment is explicit and makes no saved-work claim](engine/tests/independent.test.ts#L1395) | PASS |
| C77 | [C77 reversed evaluation clock blocks guidance instead of negative-gap progress](engine/tests/independent.test.ts#L1402); [C77 bad future event is quarantined and explicit void leaves other work available](engine/tests/independent.test.ts#L1409); [C77 F4 two-minute occurrence receipt skew becomes valid at occurrence time](engine/tests/independent.test.ts#L1531) | PASS |
| C78 | [C78 unsupported policy returns migration without rewriting old issued work](engine/tests/independent.test.ts#L1432) | PASS |

### Scope limits of executed assertions

- C51 checks immutable prepared prescriptions and subsequent domain decisions; no phone control or acknowledgement UI was exercised.
- C52–C55 and C76 exercise event replay, serialization and structural availability. Actual durable local storage, offline network synchronization and device adapters remain untested integration work.
- C74 verifies bodyweight accounting and missing-pull coverage; downstream AI summaries and clinical fatigue judgments were not executed.
- C78 verifies explicit migration refusal and retained records; no migration implementation exists in this candidate.
- The catalogue is a set of behavioral requirements. Multiple assertions/functions can map to one case; these counts are not additional simulated histories or evidence of training safety.

### Targeted follow-ups after the full pass

The full execution above covered99 independent functions. Five additional named functions were added afterward: cached-vs-cold authority, malformed public event input, direct pre-set stops, controlled time/equipment exposure, and failed-higher-calibration fallback. Each passed a fresh targeted execution. Post-void current-work authority was also added to the existing C77 regression and passed after the trace audit found the missing invariant. At that checkpoint there were104 independent functions; the parent later completed the combined121-test run described below. These targeted results are not a claim that all104 ran together against the latest candidate.

### Calibration failure-path regression and repair

Fresh build `adaptive-lifting-engine-fjVLMh` ran four strengthened tests: C06 minimum-load Hard, C07 minimum-load short, C06/C07 last-manageable fallback after5→10, and C13 below-floor home check. All four failed: the candidate repeated known failed trials or retained10 instead of restoring5. These observations supersede the earlier weaker passes for those cases. Expectations are unchanged policy, and repairs are pending. The independently recorded40-history pass covers different scripted inputs and does not close these failures.

Resolution: fresh build `adaptive-lifting-engine-9DV5aI` reran all four strengthened calibration checks after the chronological fallback repair: **4/4 passed, exit0, 0.135seconds**. The failed minimum now defers/reselects, and5/Easy→failed10 returns5 without immediately retrying10. The earlier failure remains recorded above as evidence of what the stricter tests exposed.

### Canonical data and resolved-loser follow-up

The parent subsequently reported a fresh combined run of121/121 tests and40/40 histories before these additional cases. Three new grouped functions bring the independent suite to107. Fresh build `adaptive-lifting-engine-VrOxjG` ran those three: **0/3 passed**. Sparse dependencies were accepted, and losing visit/set descendants remained pending after explicit conflict selection. These strengthen C53/C56 and supersede their earlier narrower passes until repaired; simulations were not repeated. Rejection must remain atomic, valid dense references must remain journaled, and losing records must remain auditable without supplying active authority, counts or pending blockers.

Resolution: fresh build `adaptive-lifting-engine-SR88Ks` reran the three canonical/resolved-loser regressions after the boundary repair: **3/3 passed, exit0, 0.128seconds**. Sparse and non-plain inputs reject atomically; valid dense pending references survive serialization; resolved logical losers and their descendants supply neither pending blockers nor authority/counts, and reversed replay agrees. The independent file now contains107 named test functions. A fresh combined execution with these final additions remains the parent's verification step; no extra simulation run was performed for this narrow follow-up.

### Lower manual actual and rolling anchor

A genuine established10lb history acknowledged12.5lb calibration but logged actual1lb with enough reps. Fresh `adaptive-lifting-engine-r47bYl` incorrectly blocked subsequent legitimate12.5lb guidance with `rolling_cumulative_limit`: the mismatched actual had contaminated a successful-trial anchor. After the shared-eligibility repair, fresh `adaptive-lifting-engine-9Bfsgd` passed the strengthened grouped C31/C33 test: **1/1, exit0, 0.33seconds**. It checks immediate same-approved-step eligibility and later10→12.5 guidance after real baseline work, while preserving actual1 and issued12.5 distinctly. The file now contains108 independent named functions; no extra full simulation was run for this follow-up.

### Fable implementation-audit reproductions

The full snapshot1 audit was read, and18 permanent focused functions were added for its six primary findings and secondaries. Fresh `adaptive-lifting-engine-a2tcu4` executed18: **8 passed,10 failed, exit1, 2.53seconds**. Partial/neutral return persistence, stale successful provisional rejection, tolerated clock skew, late logical closure/cached-versus-cold replay, delayed declared causal references and frozen-date replay validation passed after their owners' repairs. Manual60 short/Hard easing, unbounded remaining easier sets, same-visit Easy, unrecorded manual assessment, failed return fallback and several inventory-disappearance routes remained failing in that checkpoint. Exact required loads and authority assertions were retained. The permanent suite now contains126 named functions.

Four history extensions41–44 were authored for partial return, time-neutral return, constant two-minute occurrence/receipt offset and manual60 short working actual. They have defect-specific invariants and will bring the separate history count to44 when executed; authoring them is not a passed simulation. The original40 scripted inputs remain unchanged.

Resolution: fresh `adaptive-lifting-engine-caBsg4` ran the complete focused Fable set, now20 functions including root-slot aliasing and one-set-return remainder consistency: **20/20 passed, exit0, 3.16seconds**. Expected manual-load authority, available loads, return state, clocks and remaining-work bounds were retained. The independent source contains128 named functions.

The first combined44-history run `adaptive-lifting-engine-jxPNee` recorded42 passes and2 fixture failures across618 visits. New histories41/42 accidentally declined increases while asserting upward restoration. Only those new scripts were corrected to retain the pre-gap baseline but allow return restoration. Fresh `adaptive-lifting-engine-qxg71Z` then executed both corrected histories directly: **2/2 histories passed,16 visits each**. Those targeted checks did not overwrite the honest failed combined report; the parent's final fresh all/history pass must regenerate the44-history artifacts. Original40 input scripts were preserved. History25's description was corrected to say its increase-declined return stays stable.

The global migration refusal remains an explicit v1 boundary in the current specification: unknown policy/catalog configuration or foreign training-zone history needs a validated external migration/new journal. Voiding such history does not invent a migration. No migration implementation or physical training outcome is claimed.

### Scoped Fable recheck final edge cases

The full scoped implementation recheck was read. Fable closed the original findings by source review, while identifying two additional boundary cases. Both now have permanent public-history regressions. Fresh `adaptive-lifting-engine-hwBWRw` executed **2/2 passed, exit0, 0.84seconds**: (A) ten malformed issuance-metadata variants reject atomically, and a subsequent referencing set stays pending through append and cold replay without a crash; (B) retained20lb→established return15lb→issued but unperformed20lb restore respects next-visit decline by offering15lb, allows20lb when decline is absent, and uses verified10lb when15lb is unavailable.

The independent source now has130 named functions. These narrow results are separate from the parent's reported147-test/44-history snapshot supplied to Fable; no full history repeat was performed for the two final changes. The parent owns final combined verification and report packaging.
