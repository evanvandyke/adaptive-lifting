# Standalone training engine

This is the isolated `experimental-v1` candidate specified in [ENGINE-SPEC.md](../ENGINE-SPEC.md). It implements deterministic training decisions and event replay with synthetic tests. It is not connected to the current workout UI, Supabase tables, authentication or a live training session.

Passing a test means that a software transition matched its stated policy. It does not establish appropriate loads for Evan, physiological safety or expected strength gains. The numerical policy is experimental; the catalogue, observed inputs and explicit bounds determine what the candidate can propose.

## Run and inspect

From the project root:

- `npm run test:engine` compiles and runs the independent and focused behavior suites.
- `npm run simulate:engine` compiles and executes multi-visit synthetic histories, writing their actual event/decision traces and invariant results to `engine/reports/`.
- `npm run check:engine` compiles once, runs the suites, then executes the histories.
- `node engine/run.mjs typecheck` performs the isolated strict compilation.

The runner uses the existing local TypeScript installation and Node's built-in test runner. It was developed with Node 26; it adds no package dependency. Every invocation compiles into a new operating-system temporary directory. A compiler or child-process failure stops the run with a nonzero exit code. Child processes have a 120-second limit. No prior compiled output is reused and no user files are deleted.

`reports/SUMMARY.md` and `reports/latest.json` describe the latest simulation attempt, including its run ID and status. A running or failed attempt is not a passing result. The scenario runner emits detailed failed traces before returning a failing exit code; the outer runner preserves those details when the run ID matches. Treat the report's source hash and run ID as part of its evidence.

## Public boundary

Import the functions and types from `engine/src/index.ts`:

| Function | Purpose |
|---|---|
| `createState(config)` | Start with an explicit, immutable training time zone and policy/catalog versions. |
| `applyEvent(state, event, observedAt?)` | Validate and retain an envelope, returning accepted, duplicate, conflict or rejected plus a new state. Explicit trusted observation can supply its receipt time. |
| `replay(config, events, asOf?)` | Resolve the journal and issuance authority deterministically. An optional injected as-of time advances pending near-future observations without reading a wall clock. |
| `recommendExercise(state, context)` | Return a ready prescription or an explicit setup, calibration, hold, stop or migration outcome. |
| `planVisit(state, context)` | Propose the structural sequence, set counts, omitted coverage and estimated duration. Each actual exercise prescription still passes the recommendation/acknowledgement boundary. |
| `summarize(state, asOf?)` | Summarize observed work, attendance, completion and next-date gym rotation. |

Use these wrappers rather than importing internal journal/planning modules. The wrappers supply an authority-checked projection at the requested time. Internal modules deliberately have narrower preconditions.

The state is plain serializable data. `normalizeLoad` is a public exact-arithmetic helper that returns `bigint`; load values in events and prescriptions remain `{ amountMilli, unit }`, such as 1250 thousandths of a pound. The core uses `BigInt(...)` for comparisons, preserving fractional plates and preventing percentage arithmetic overflow. Machine identity includes its stack/setup and displayed unit. Bodyweight uses a separate loading mode and no invented equivalent-pound tonnage.

## Event journey

1. Record `visit_started` with the start instant, setting, pinned template, training time zone and derived training date.
2. Record controlled rehearsal and preparation for the exact variant/setup. Record explicit recovery readiness when an upward load trial requires it.
3. Request a recommendation with verified equipment, attainable inventory, current time and remaining time allowance.
4. A ready decision has `status: proposal` and a prescription whose kind is working, calibration or return. Acknowledge its exact content with `prescription_issued`; a global revision number alone is not authority.
5. Record actual sets against the issued prescription and set index. Actual reps, load, side counts, feedback, cause and timing quality stay separate from the issued values. Manual work may be recorded without pretending an issued prescription existed.
6. Correct actuals with a new revision referencing the predecessor event. Resolve genuine conflicts explicitly. Finalize the visit separately from its set records.

Discomfort needs no fabricated set: `movement_stopped` records a pain/control-loss signal before any reps or load are confirmed. It feeds the movement-family latch, adds no attendance or exposure credit, and is resolved through referenced `stop_resolved` sources followed by fresh preparation.

Preserve `workingSetBudget` and `replacement` when acknowledging prescriptions. The budget is zero for calibration; otherwise it is the approved total working allowance for this identity/visit, not a fresh allowance on every proposal. Easier work consumes remaining original slots. Replacement metadata maps **local** indices to original slots: a returned one-set replacement still records `setIndex: 0`, even when it replaces original slot 1. The original issued prescription and actual records remain immutable. Completed replacement coverage can finish the visit while the short original performance remains adverse progression evidence.

`assessManualLoad` requires a genuine matching recorded actual and the same evidence, timing and load bounds as an eligible trial. Recording a manual value does not authorize that load, and an out-of-policy short set cannot supply an easing weight. New prescriptions check current attainable inventory; a changed proposal still needs acknowledgement before it replaces prepared work.

Logical event fingerprints exclude receipt metadata and omit undefined optional object fields consistently with JSON. Identical retries retain their earliest trusted receipt. Competing event/revision payloads and duplicate logical visit/set slots cannot win through arrival order. Unknown references remain pending. Invalid clock records can be voided while their raw history remains available.

Historical issued prescriptions are checked against their causal observation snapshot. A subsequent correction changes future guidance and flags affected dependencies; it does not rewrite the values previously issued or erase later performed work. An internal weak cache only skips unchanged historical validation, using captured input facts; it is not serialized policy state.

## Adapter responsibilities

The caller supplies truthful, validated observations and verified available equipment. `receivedAt` is a trusted adapter observation; neither the event's occurrence timestamp nor a client-provided claim substitutes for it. Preserve the stored training date and immutable training zone. An explicit `asOf`/`context.now` is the evaluation time; when omitted from replay or summary, the default is the latest canonical retained receipt watermark.

Content IDs identify data, not people. The eventual adapter must authenticate/authorize the user and durably save accepted events before reporting a successful save. This module performs no storage or synchronization. Its deterministic merge/replay tests do not prove real offline durability, a working rest notification or browser behavior.

Rehydrate saved journals through the public replay function. Do not treat externally supplied cached projections or internal validation metadata as authority. Preserve raw accepted/quarantined/conflicting records so the UI can explain and repair an exceptional state.

## Deliberate limits

- A standard 45-lb-only bar has no initial back-squat entry path under this policy. The candidate offers eligible goblet/bodyweight alternatives or requests setup.
- The starter caps and low-load exploration ceilings are explicit. The engine holds and explains an unsupported inventory step instead of manufacturing fractional equipment.
- A return check uses the policy's frozen retained-load band and requires re-establishment. The 14/42-day thresholds and 85% check are engineering choices, not measurements of detraining.
- Unknown timing permits ordinary rep evidence but does not become measured rest or qualify extra-rep acceleration.
- Pain or control-loss reports latch a stop across the movement family, including when a later correction removes the flag. Explicit resolution and fresh preparation are required.
- Home floor work has no adequately loaded pulling replacement in this catalogue.
- Timing is a structural estimate using synthetic assumptions. Shortened plans retain the preparation/recovery allowance and disclose omitted work.

The UI, database adapter, real save/reopen behavior and individual workout fit need their own verification before this candidate guides live training.
