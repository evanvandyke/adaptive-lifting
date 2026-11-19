# Adaptive Lifting: Standalone Engine v1

2026-11-19 · America/Denver · Policy `experimental-v1`

Evan authorized an isolated implementation and executable simulations while design work continues. He reports no injuries and describes himself as starting from zero; actual current capacity is unmeasured. This spec closes the numerical policy choices in [TRAINING-PLAN.md](TRAINING-PLAN.md) for a **software candidate**, not a clinically validated prescription, BAU5 reconstruction or live-app release. Passing simulations proves rule conformance, not suitable loads or gains. Authentication, database writes, offline durability and UI integration remain outside this module.

## Contract and identity

Pure TypeScript API in `engine/`: `createState(config)`, `applyEvent(state,event,observedAt?)`, `replay(config,events)`, `recommendExercise(state,context)`, `planVisit(state,context)`, `summarize(state)`. The optional `observedAt` overrides receipt time only when explicitly supplied by the trusted adapter. No clock, randomness, network or storage access inside these functions. Supply `now`, immutable training time zone, policy/catalog versions and verified inventory. Return new objects; never mutate input. Public shapes are the agreed `engine/src/types.ts` contract; the event table below is normative.

`applyEvent` returns `accepted | duplicate | conflict | rejected`, reasons and next state. Only intrinsic malformation is rejected. Well-formed unresolved, conflicted, quarantined or policy-ineligible events remain journaled with explicit projection status. `Decision.stateRevision` is informational; it is not an acknowledgement authority.

| Decision status | Payload contract |
|---|---|
| `proposal` | Exactly one ready `Prescription`; `kind` is `working`, `calibration` or `return`. Trial/return labels and prerequisites remain explicit. |
| `needs_setup` | Missing equipment/setup; no prescription; eligible alternatives may be listed. |
| `needs_calibration` | Missing rehearsal/current check prerequisites; no prescription. Once ready, the trial is a `proposal`. |
| `hold` | Explained cap, plateau, conflict, pending reference, quarantine or time issue. Only an ordinary nonblocked hold may include an unchanged eligible prescription; blocked/unknown cases have none. |
| `stop` | Unresolved pain/control-loss latch; no prescription. |
| `needs_migration` | Unsupported version/training-zone history; no prescription. |

`declineIncrease` suppresses upward proposals only; it cannot suppress stop, preparation, return handling or gentler guidance. Acknowledgement is the `prescription_issued` event binding exact content ID and causal dependency fingerprint. Recompute stale relevant content; unrelated global event counts do not invalidate it. Logging actual work never requires pretending a proposal was accepted.

Identity is `(movement, variant, setupId, loadingMode, loadingConvention)`. Settings alone do not split identical dead bugs into separate histories. Machine stack/cable configuration and incline height are part of setup. Loading modes distinguish bodyweight, added load and external load; missing weight is not zero. Conventions are total bar/single implement, per hand for symmetric dumbbells, or nominal load on one identified machine. Never compare nominal machine load with free-weight load.

Represent quantities as integer thousandths of their declared lb/kg units (`amountMilli`, so 1.25 lb is 1250). Normalize internally to integer nanograms (`1 kg = 1,000,000,000,000`; `1 lb = 453,592,370,000`). Inputs remain safe integers; use exact `BigInt(...)` arithmetic internally for normalized values and percentage comparisons, without BigInt literals (the repository targets ES2017). Reject negative/nonfinite values or unsupported input precision rather than silently round. Convert every lb policy cap exactly before comparing kg inventory or kg-labelled stacks. Normalize/sort/deduplicate verified inventory; prescribe only original attainable entries. Machine comparisons require the same stack ID and declared displayed units. No estimated bodyweight tonnage.

Issued set records are immutable: ID, visit, identity, role, target per set/side, load entry, context, preparation/recovery requirements, policy and dependency IDs. Versioned actuals retain reps per side, actual load, completion, feedback `easy | manageable | hard | unknown`, cause `effort | unknown | equipment | time | interruption`, `timingQuality` (`measured | reported | unknown`, default unknown), and pain/control/interruption flags. Missing reps cannot be confirmed; zero actual reps is valid attempted work, not success. A two-sided set succeeds only when both sides independently reach target. No averaging or rep pooling.

## Ordered decisions

Apply in this order: (1) intrinsic/version validation and affected unresolved conflicts; (2) movement-family stop latch; (3) stale visit, clock or renewed-preparation requirement; (4) setup/inventory/rehearsal; (5) frozen absence/return mode; (6) short-set/plateau/provisional handling; (7) calibration, date, rolling and time limits; (8) eligible upward progression; (9) explained hold. Limits and `declineIncrease` suppress only new trials/upward work, not an otherwise eligible current prescription, stop or easing. Preserve actuals outside policy without endorsing their load.

## Catalog and initial selection

Gym templates are A squat/flat press/row/calf/dead bug and B hinge/incline press/pulldown/split squat/dead bug. A starts with eligible goblet squat, otherwise bodyweight squat. Optional back squat requires a verified training bar at or below its 20-lb starter cap, rack/safeties and its own rehearsal. Standard 45-lb-only inventory has no back-squat entry path in v1: choose goblet/bodyweight and omit the unreachable goblet-to-back transition.

Setup must be verified. A controlled unloaded rehearsal acknowledgement lasts less than 14 elapsed days for the exact identity; first-use/return/reselection requires one in the current visit. Preparation is required each visit and again after a 30-minute pause, stop or setup change. Unknown rehearsal yields `needs_calibration` with unloaded instructions; unknown equipment yields `needs_setup`.

With no usable current observation, select the smallest verified positive inventory entry at or below the starter cap. Later calibration resumes the latest successful provisional trial prescription under unchanged caps rather than restarting at the smallest implement. If no eligible load exists, propose the catalog's eligible easier variant or return an explained non-prescription. An ordinary 45-lb bar is not assumed suitable. Each new identity calibrates separately.

| Candidate variants | Reps | Start cap / first-use ceiling / maximum trial step (lb) |
|---|---:|---|
| Flat/incline dumbbell press; supported dumbbell row | 8–12 | 10 / 20 / 5 per hand |
| Dumbbell Romanian deadlift | 6–10 | 10 / 30 / 5 per hand |
| Goblet squat | 6–8 | 10 / 30 / 5 total |
| Back squat with verified light bar/rack/safeties | 6–8 | 20 / 40 / 5 total |
| Lat pulldown, identified stack | 8–12 | 20 / 40 / 10 nominal lb |
| Optional dumbbell lateral raise | 10–15 | 2.5 / 10 / 2.5 per hand |
| Added-load calf raise/split squat, paired dumbbells | 10–15 / 6–10 per side | 2.5 / 10 / 2.5 per hand |

Unloaded first-use options: air squat 8–15, standing calf raise 10–15, split squat 6–10/side, glute bridge 8–15, dead bug 6–10/side, wall/incline/knee/floor push-up 6–12. Select wall push-up when a suitable wall is verified; otherwise knee push-up can be rehearsed with floor space. No usable variant yields `needs_setup`, not presumed floor-push-up ability.

Allowed candidate transitions, each requiring its own successful check: wall → verified incline → floor push-up; knee → floor push-up; air squat → split squat or goblet squat; glute bridge → single-leg bridge (8–15/side); bilateral calf → single-leg calf (10–15/side); unloaded split/calf → the added-load variants above; goblet → separately rehearsed back squat only with the eligible light-bar setup. These are candidates, not guaranteed ordered difficulty. Dead bug, floor push-up and single-leg bridge have no further automatic variant in v1: explain the endpoint and retain practice or offer an equipment-supported catalog alternative. No improvised anchors or assumed pulling substitute.

## Calibration and cumulative bounds

Weighted trials aim up to the range floor, stopping earlier for technique/pain/difficulty. A completed floor trial without difficulty supplies a provisional two-set, floor-target prescription, even with unknown feedback; it establishes neither ease nor a baseline. Hard/short trials select the previous successful trial or the next lower available entry; if none exists, defer/reselect. Feedback Easy permits the next inventory entry only within all applicable bounds. Trial roles remain calibration permanently.

**Low-load branch:** whenever the proposed target is at or below the catalog first-use ceiling, both new and established prescriptions may use the next inventory entry under **100% relative AND catalog absolute-step** limits. The first positive load uses the starter selector, never a percentage of zero. Initial first-use exploration allows up to three trials/identity/visit; once a baseline exists, at most one upward step/identity/training date, with two-date establishment before another load increase. Repeated Easy cannot chain steps. Per-visit cumulative increase is ≤100% AND twice catalog step from the first approved positive load of that visit. Rolling low-load increase is ≤100% AND twice catalog step over 168 hours from the retained anchor below. Fixed catalog ceilings still apply. This is a controlled-trial exception, not a normal automatic doubling rule.

Floor-only home first use permits four total check sets, initially one per movement; retries consume the allowance. Check up to range ceiling with controlled reps available. Use the weaker side's achieved count: `max(floor, min(ceiling, weakerActual - 2))`, only when both sides achieved floor. Otherwise easier variant/defer. Gym/new weighted first-use visits permit two identities and three trials each; continuing an unestablished identity consumes the identity allowance too. All calibration shares six elapsed minutes from the first trial start, including inter-trial recovery/setup. Start a trial only if its estimated duration plus required preceding recovery fits both remaining budgets. Preserve truthful overruns but issue no further trial. Separately issued working sets after calibration can count as that date's one exposure.

Easy on a successful check or complete exposure, or two ceiling successes, may request the next load whether its increment is above or below 5%. Require current preparation/recovery acknowledgement, explicit trial acknowledgement and available budget. Established-mode earned upward work is issuable only on a later training date AND at least 12 hours after its qualifying evidence. Initial controlled first-use exploration is the explicit exception. A changed load finishes its two-success gate before another increase.

Above catalog ceilings, use these limits; each cell is an AND, not whichever is larger:

| Convention | Coarse step AND per-visit cumulative limits | Rolling 168-hour limits |
|---|---|---|
| Dumbbells/per hand or goblet total | ≤25% AND ≤5 lb | ≤30% AND ≤10 lb |
| Bar total | ≤15% AND ≤10 lb | ≤25% AND ≤20 lb |
| Same nominal stack | ≤25% AND ≤10 nominal lb | ≤30% AND ≤20 nominal lb |
| Lateral raise/added calf or split load | ≤25% AND ≤2.5 lb/hand | ≤30% AND ≤5 lb/hand |

The visit anchor is the lower of baseline and approved provisional load at visit start, held fixed. Rolling anchor is the minimum of the established value active at `now − 168 hours` and every established snapshot entered since. If first establishment is inside the window, include its first value. Before any baseline exists, use the first successful approved positive trial in that window; preserve it through establishment until it ages out. Provisional ratchets, mode changes and new visits never reset either budget. The low-load branch is selected by the **target** being within its catalog ceiling; targets above it obey normal limits. Reductions are not constrained by upward limits.

An ordinary earned step ≤5% can remain a working proposal, subject to its applicable low-load/normal cumulative budget. Larger allowed steps are controlled calibration proposals. Examples: 40→45 lb/hand uses normal coarse bounds; 10→15 within a 20-lb ceiling uses acknowledged low-load bounds, if rolling/date gates allow it. A target beyond all eligible bounds holds with an inventory explanation and alternatives. No unrestricted override exists.

## Evidence, progression and difficulty

Maintain baseline, provisional prescription, success dates, difficulty dates and failed-proposal dates separately. Two comparable successes on distinct training dates **and at least 12 hours apart by performance-end instants** establish a provisional prescription and may earn one bounded future proposal. Evaluate the pair once for that exact prescription; next-prescription count starts at zero. All earned upward proposals require a later date AND 12 hours after their qualifying evidence; replay cannot advance multiple target levels.

Comparable starting context has the same identity, issued load, targets and planned set count. Paired/straight changes and longer recovery can qualify. Explicit short recovery, unusual pre-fatigue, equipment/time/interruption causes are neutral exclusions. Exposures aggregate once per identity/date across visits; never combine unfinished sets from separate visits to complete a prescription. Any short/hard/pain exposure vetoes that date's positive evidence regardless of event order; only policy-eligible difficulty contributes to its counter. Later same-date work can retract an unstarted earned increase, never erase performed work.

Aggregate feedback: any hard report dominates; otherwise final-required-set Easy plus all targets met is Easy; all other absent/mixed reports remain unknown/manageable. `cause` is explicit; missing cause is unknown, while complete-but-hard is effort-related difficulty. “Controlled” in this software means a valid rehearsal and no reported control-loss/pain flag, not sensor-verified form. Recovery is derived from set times only when `timingQuality` is measured/reported; `shortRecovery:true` always excludes. Unknown timing stays labelled unknown, permits ordinary rep evidence, disables extras acceleration, and requires explicit current `preparation_confirmed.recoveryConfirmed` for an upward load trial. Batch-entry timestamps are not assumed rest measurements.

| Observation/state | Deterministic transition |
|---|---|
| Complete targets, no adverse flags | One success; reset difficulty streak. Two qualifying dates establish/progress. Exclusions/partials without shorts skip counters. |
| Complete but hard, or eligible short | No success; reset success streak; one difficulty/date. Two consecutive effort-related dates, or three adverse dates with unknown/mixed cause, propose one fewer rep; at floor use next lower inventory/easier variant. |
| First short today | Offer more rest and one fewer rep on unstarted work; at floor lower eligible load. Second short proposes ending movement. Untouched sets are not misses. |
| Ordinary progression | Two successes propose +1 per set below ceiling. If targets differ, level the lowest targets toward the highest first: 9/8→9/9, never 10/9. |
| Extras on established variant/load | All sets/sides individually hit target; final extras `min(2, actual−target)` can earn the same +1-rep future proposal after one exposure. Rep-only provisional targets remain eligible; baseline targets remain unchanged until their two-date gate. No extras on changed loads, new variants, returns or unestablished plateau bridges. |
| Rep-only trial chain fails | Return to last **established** targets, not merely observed intermediate targets, except for the qualified two-failure bridge below. Retain all actuals. |
| All sets at ceiling twice | Next available ≤5% load is an ordinary provisional proposal if all cumulative gates pass; otherwise eligible acknowledged low/coarse trial. Reset reps to floor. |
| Same increase fails twice | Preserve failure dates across baseline returns. If both eligible failed rep trials still met every established baseline target and had no hard, pain or interruption flag, offer the one-set bridge on the next eligible date, at least 12 hours after the second failure; no additional pair of baseline sessions is required. Thus established 8/8 with two 9/9 trials completed as 8/8 can next try 9/8. Actuals below baseline, current difficulty, return or stop gates take precedence. Load trials use the explicit terminal-hold route. Establishing the different bridge clears failures tied to its superseded baseline, then levels 9/8 to 9/9 before increasing to 10/9. |
| Terminal hold release | A genuinely smaller eligible inventory step can produce a different proposal. Retrying the same failed target requires two new full baseline exposures after its last failure, latest recovery report manageable, and explicit `requestTrial`; permit one retry within all bounds, retain failure history until actual establishment. Reopening calibration alone releases nothing. |
| `declineIncrease` | Keep eligible existing work; still honor stop/return/preparation/easing. |

Manual edits preserve actual and issued load. They cannot satisfy the issued-load gate. An edited load is eligible for future assessment only if it is issuable as a trial **now** under the same bounds and acknowledged; typing it never changes anchors. An out-of-policy manual record remains truthful but supplies no positive load authority.

**Latched stop:** any intrinsically valid revision or role ever carrying pain/control loss creates a stop source, including warm-up/manual/conflict candidates. A direct `movement_stopped` event creates the same source before any set or weight is confirmed; it creates no set, reps, attendance, exposure or progression credit. The latch persists across visits for that identity and sibling variants sharing the catalog movement family. Removing a flag or voiding a bad-clock record does not erase the latch. `stop_resolved` must reference every active source being resolved, acknowledge it, and be followed by fresh preparation; unresolved sources continue blocking. A retroactive flag vetoes its original date's positive evidence and blocks future guidance. Later performed work remains immutable history, with dependency flags; no new recommendation uses it until resolution. Later actuals that were independently policy-eligible can still contribute after resolution; a known unresolved stop at issuance makes that issuance ineligible.

Corrections replay actual evidence chronologically while retaining original issued prescriptions. A retracted trigger flags dependencies but does not erase later higher actual performance. Only unstarted guidance changes; prepared work needs acknowledged replacement.

## Visits, returns and time planning

Config training time zone is immutable with history; unsupported changes require migration. `visit_started.payload.trainingDate` is derived from start/time zone by the adapter, validated on acceptance and persisted; replay uses that frozen date. Display-zone changes cannot alter it. UTC elapsed durations handle midnight/DST. A valid event beyond its first trusted receipt by more than five minutes is permanently quarantined until explicitly voided/replaced; later retries never rehabilitate it. Other identities continue. Events no more than five minutes ahead are pending until their occurrence time, not early evidence. `now` before the relevant visit/start or causal work yields an affected-context clock hold, not a global deadlock.

Ordering for eligible work is visit start ≤ rehearsal/preparation ≤ issuance ≤ set start ≤ set end ≤ event occurrence, with all within the same open visit. Warm-up/manual records may lack issuance, but retain visit/start/end order. A correction occurs after its predecessor; its original performance timestamps remain immutable. Gaps **≥6 hours** close the visit operationally at last activity + six hours. Later logged work remains retained but ineligible for its expired visit; it is never merged automatically. Pauses **≥30 minutes** require renewed preparation. Only performed work/preparation changes activity, not repeatedly opening a plan.

One attendance credit per stored training date requires confirmed non-warm-up work with at least one actual rep. Pin a gym template to that date: all same-date gym visits use A or B selected for the date, even after a morning visit ends. The first qualifying finalization consumes that date's template once and makes the opposite template due on the **next date**. An unplanned different-template record stays truthful but cannot consume an additional rotation. Home has its own date/sequence and never consumes gym A/B. Warm-up-only dates consume neither credit nor rotation. Two consecutive applicable planned omissions promote that pattern earlier next time after a protected priority lift. Calibration-deferred identities are not false failures. First-use order is A squat/press, B hinge/pull, then remaining eligible identities.

A substantive visit has at least six non-warm-up sets across three identities; suggest 48 hours before another, without lockout. Brief partial work does not automatically defer the next normal visit.

The absence clock uses original performance-end time of controlled, policy-eligible completed working/calibration actuals with ≥one rep on every side and no pain/interruption. Short controlled work can refresh exposure while also counting difficulty. Warm-ups, attendance, plan opening, out-of-policy manual records and correction time cannot refresh it. Evaluate/freeze absence mode at visit start, from observations strictly before that start; later check success cannot unlock an increase in that visit.

**Return epoch:** at absence ≥14 and <42 elapsed days, retain the last established prescription; if absent, retain the latest usable provisional observation, otherwise use first use. Initial external check load is the largest verified entry ≤85% of the retained load, with **two sets at range floor**. If none exists, use `needs_calibration` for a verified eligible lighter variant needing a check, otherwise `needs_setup`; never round upward. Bodyweight uses its verified variant at range floor after current rehearsal. A failed external check selects the next lower available load or defers; pain stops. Return prescriptions have `kind:return`, first role `return_check`, second `working`; these are working evidence, not calibration slots.

Freeze the retained pre-gap load and initial check load for the epoch: repeatedly opening visits never compounds 85%. Two comparable dates ≥12 hours apart establish the check prescription. Then restore toward the retained load by **one next available entry per training date**, each step ≤100% AND the catalog absolute step, never above retained load. Each restored step needs its own two-date establishment. Restoration rolling increase is ≤100% AND twice catalog step over 168 hours. Its anchor is the minimum of the restoration baseline active at window start and restoration snapshots entered within the window; the initial check load serves as the epoch's first baseline and is not retained forever after it leaves that window. This explicit allowance replaces normal coarse percentages only within the retained return band. No gap/decline/manual route can raise its retained ceiling. If no step fits, explain the equipment limit and hold/reselect.

After the retained load is re-established, exit return mode at floor reps; resume ordinary progression later. For bodyweight, exit after its two-date gate. A further qualifying gap during unfinished return reuses the retained load, rather than applying 85% to a transient return target. At ≥42 days, archive prior capacity and restart bounded first use with fresh rehearsal; it does not authorize heavier work based solely on history. These thresholds and 85% are engineering hypotheses, not measured detraining.

Planning constants: ordinary/low-target dead-bug set 40 sec; split squat both sides 75; priority straight rest 150; other straight/paired-round recovery 90; within-round changes A press/row 40, B press/pulldown 60, floor 20. Between-round recovery includes return setup and extends when needed. Gym fixed overhead 600 sec plus 120 sec for each transition between **remaining** blocks; known home fixed overhead 300 sec plus 60 sec between remaining blocks. Straight within-block transitions are 60 sec A/80 sec B when both pairs remain, allocated 40/20 A and 60/20 B. Trial recovery is 90 sec, priority 150, different home checks 60. Set count determines work, transitions and inter-round rests; no rest follows the last set/round.

Budget default is 1800 sec; equality fits. If recommendation `remainingSeconds` is omitted, use `max(0,1800 − elapsed visit seconds)`; an explicit value represents the caller's remaining allowance. Calibration still obeys its independent six-minute limit. Remove optional sixth movement, then third rounds, then block 3 sets from the end, recalculating remaining overhead each time. If priority + block 2 cannot fit, `hold` reports the minimum estimate; no compressed recovery or invented completion. `planVisit` is a structural proposal: each actual prescription still passes `recommendExercise` and acknowledgement. When a movement's established load is absent from inventory, offer the largest verified lower entry as a provisional substitution or `needs_setup` if none exists; never silently round up.

`desiredSets`/`plannedSets` are requests, not bypasses. Max is three working sets **per identity per visit**, with approved planned slots normally two or an earned, acknowledged three; increase only one identity's count per visit, priority first, then block 2, then block 3 in listed order. Replacement/easier prescriptions consume remaining original slots rather than adding work. Recalibration cannot restart an ordinary-work allowance after those slots are completed; calibration retains its separate cap. Once the ordinary allowance is issued, later volume growth waits for a future visit rather than rewriting completed slots. Both planner and recommender require two full current-volume exposures on eligible dates ≥12 hours apart, latest relevant `recovery_reported` manageable and a fitting estimate. A relevant report belongs to a visit containing this identity and is at most seven days old; `PlanContext.recoveryFeedback` alone does not authorize a change. Issuance acknowledges the volume change; hold load/reps and reset matching success counters. `plannedSets:1` is explicitly shortened work: retain the two-/three-set baseline, completion is neutral for upward success/establishment, but a true short/hard set can count difficulty. Unknown recovery feedback holds volume, not ordinary rep progression.

## Journal and public event contract

`EventBase` fields: `id`, `entityId`, `revision`, `occurredAt`, **trusted injected `receivedAt`**, `policyVersion`, optional `previousEventId` and `dependencies`. Logical fingerprints exclude receipt time. Identical retries use the earliest trusted receipt, preserving quarantine. `applyEvent(...,observedAt)` may set that receipt explicitly; never infer it from occurrence time or `Date.now`. Intrinsic validation covers shapes, IDs, finite integer quantities, supported enum values and parseable timestamps, not arrival-dependent state eligibility.

| Event type | Payload and replay rule |
|---|---|
| `visit_started` | `{visitId,setting,template,timeZone,trainingDate,plannedIdentities?}`; immutable start/date; later conflicting starts block that visit. |
| `visit_ended` | `{visitId}`; finalize once. Pending if start unknown. |
| `rehearsal_confirmed` | `{visitId,identity,controlled}`; known setup identity; false never supplies rehearsal authority. |
| `preparation_confirmed` | `{visitId,identity,recoveryConfirmed?}`; explicit current readiness, must follow a stop resolution/long pause when applicable. |
| `recovery_reported` | `{visitId,feedback}` with manageable/unknown/difficult; latest applicable report gates volume/retry; never inferred from missing data. |
| `prescription_issued` | `{context,prescription,expectedStateRevision}`; explicit acknowledgement. Prescription has content ID and `dependencyFingerprint`; global revision is informational. Optional `replacement:{rootPrescriptionId,setIndices}` binds it to uncompleted slots of the immutable original prescription, never a fresh allowance. |
| `set_recorded` | `{visitId,identity,prescriptionId?,setIndex?,role,startedAt,endedAt,actual}`; immutable logical set identity and performance times; may record manual actuals without issued authority. |
| `set_corrected` | `{actual}` with same entity, next revision and predecessor event ID; changes actuals only, not visit/date/identity/mode. |
| `movement_stopped` | `{visitId,identity,reason}` with reason `pain` or `control_loss`; direct discomfort/control-loss action feeding the movement-family latch without creating an actual set or any training credit. |
| `stop_resolved` | `{visitId,identity,acknowledged,stopEventIds}`; references existing latch sources; fresh subsequent preparation is still required. |
| `conflict_resolved` | `{targetEntityId,targetRevision,expectedCandidateKeys,selectedCandidateKey}`; complete candidate set and causal selection, itself versioned. |
| `event_voided` | `{targetEventId,reason}`; retains original raw history with tombstone, removes its ordinary evidence. Voiding a pain source still requires stop resolution. Replacement factual work uses a new ID with corrected time, never guessed automatically. |

Content IDs use canonical serialized prescription content and sorted causal references, not network arrival order or unrelated event count. Validate issuance against its declared causal event revisions and trusted receipt-time snapshot. A later correction flags dependencies without erasing originally valid issuance. Malformed issuance is rejected; well-formed but stale/invalid-policy issuance is retained as ineligible and its actual work supplies no positive prescription authority.

Same event ID/payload is duplicate; different payloads at the same ID or entity revision are conflicts. A correction always references its predecessor event ID, so sibling revisions remain conflict candidates even if a descendant of one arrived first. Record both, choose neither by arrival order, and block affected future recommendations until explicit resolution. Unknown valid references remain pending with no evidence. Quarantined/voided/ineligible/pending IDs are visible in projection, separate from accepted authoritative events.

Replay resolves revision chains/conflicts first, then derives exposures by immutable original performance times with stable content-ID tie ordering. Equivalent event multisets yield identical projection/decisions in every permutation. Unsupported policy/catalog versions or changing training time zone with history return `needs_migration`; v1 invents no migration. This is a global v1 boundary: unsupported policy/catalog configuration or foreign training-zone history requires a validated external migration or new journal; voiding an envelope does not reinterpret that retained history. Persistence acknowledgement belongs to an external adapter; these pure functions prove no real offline durability.

## Numerical policy registry

Catalog/tables above are authoritative experimental bounds, not physiological claims.

| Parameters | Purpose and limit |
|---|---|
| Catalog ranges; initial two working slots; maximum three per identity/visit; one added set/visit | Finite targets and volume; replacements consume original slots and calibration cannot reset the allowance. |
| Starter caps, low-load ceilings/steps; relative 100%; rolling twice catalog step/168 hours | Bridge small implements through controlled trials; preserve anchors after establishment. |
| Normal automatic 5%; normal coarse/rolling AND limits | Bound both relative and absolute changes above low-load ceilings. |
| Two gym identities, three trials each; four home checks; six minutes | Bound calibration effort/time; real recovery can end it earlier. |
| Two distinct dates plus 12 hours; every earned increase later date plus 12 hours | Prevent midnight/repeated-visit gate farming; initial controlled exploration is explicit exception. |
| +one rep; extra-rep signal capped at two; weaker-side home check minus two | Small changes without pooling successful and failed sets/sides. |
| Two effort or three mixed/unknown difficulty dates; two failed increase dates | Respond to repeated difficulty; successful eligible exposure resets difficulty. |
| Two omissions; one attendance credit/date; six sets/three identities; soft 48 hours | Separate coverage, attendance and recovery suggestions. |
| Absence 14/42 days; initial return 85%; restoration step/rolling bounds | Frozen return epoch, not a detraining estimate or repeated percentage cut. |
| Rehearsal <14 days; preparation after 30-minute pause; visit expiry six hours | Explicit continuity and preparation requirements. |
| Receipt future tolerance five minutes; report age seven days | Quarantine bad clocks; keep recovery decisions current. |
| Work 40/75 sec; recovery 150/90 sec; pair changes 40/60/20 sec | Structural estimates, not measured promises. |
| Gym overhead 600 + 120 sec/block transition; home 300 + 60; straight changes A 40/20, B 60/20 | Recalculate when a block disappears; no phantom setup savings. |
| Trial recovery 90 sec, priority 150, different home checks 60; budget 1800 sec inclusive | Preserve recovery; do not start a trial that cannot fit its estimate. |

## Required example outputs

| Fixture | Expected result |
|---|---|
| New press, verified 5/10/15 inventory, rehearsal/preparation ready | `proposal`, kind calibration, 5×8; no established baseline. |
| Only standard 45-lb bar | No back-squat entry path; eligible goblet/bodyweight alternative or `needs_setup`. |
| Bodyweight check left 10/right 8, range 6–12 | Provisional target 6 per side; check stays calibration. |
| Provisional 8/8 succeeds on two dates 12 hours apart | Establish 8/8; future 9/9 waits another later date and 12 hours. Replay cannot produce 10/10. |
| Successful dates only ten minutes apart | Second observation cannot complete the gate. |
| Rep-only trial 9/9 at established load achieves 9/11 | May propose future 10/10 under date/time gates; intermediate 9/9 is not automatically established after one date. |
| Target 8/8, actual 7/10 | Short; extras do not compensate. |
| Established 10, next 15, catalog ceiling 20 | Conditional low-load trial, subject to absolute/rolling/date bounds, not a categorical 25%-cap hold. |
| Established 40, ceiling success, next 45 | Normal coarse trial if gates pass. Anchor cannot ratchet from 40 merely because 45 becomes provisional. |
| Return baseline 20, inventory 15/20 | Initial return 15; two-date gate then bounded restoration to 20, never 85% of 15 on each reopen. |
| Established 8/8; two failed 9/9 trials each actually achieve 8/8 without adverse flags | Next eligible date/12 hours permits a 9/8 bridge without another baseline-success pair; after bridge establishment, level to 9/9 before 10/9. |
| Earlier 8 corrected to 6 after later 9/9 | Preserve later issued/actual 9/9; recompute unstarted guidance. |
| Pain revision later corrected false | Stop remains until referenced resolution and fresh preparation, including sibling variants. |
| Future-dated event beyond receipt+5 minutes | Quarantine that event; other work continues; explicit void/replacement repairs bad time without invented history. |
| Same revision receives competing corrections in either order | Identical unresolved conflict and blocked affected recommendation. |
| Morning A completed, another gym visit same date | Date stays A; next-date template B; no extra same-date rotation consumption. |
| Known home full template | 940 sec (15.7 min), missing pulling coverage visible. |

The independent [scenario catalogue](ENGINE-TEST-CASES.md) supplies behavioral cases. Reconcile expectations with this version, then execute them against the isolated candidate. Numerical boundaries, determinism and preservation of records—not physiological safety—are what those tests assert.
