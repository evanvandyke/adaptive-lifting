# Standalone training engine: results

Thursday, November 19, 2026 · America/Denver

**The standalone candidate is implemented, exercised and independently reviewed.** It is ready for an integration review with the forthcoming design. It is separate from the current app's UI, database and authentication.

## What is implemented

The [public engine](engine/README.md) accepts confirmed observations, verified equipment and explicit time. It selects bounded calibration or working prescriptions, tracks established versus provisional performance, handles setbacks and returns, plans gym/home visits, and preserves issued values while resolving corrections and conflicts. It can also give a clear setup, calibration, hold, stop or migration result instead of inventing a prescription.

Exact candidate rules are in [ENGINE-SPEC.md](ENGINE-SPEC.md). The original training draft supplies program context; the specification and source own the executable transitions.

## Verified outcomes

| Check | Actual result |
|---|---|
| Behavior suites | **149/149 passed**: 130 independent functions and 19 planner tests; none skipped or cancelled. |
| Longer histories | **44/44 passed** across **618 simulated visits**, 4,462 events and 1,285 projected sets. |
| Fable 5.2 | All reported findings closed; final scoped PASS. Read-only review, not an independent runtime or clinical test. |
| App-wide TypeScript | Passed. |
| ESLint on new engine code/tests | Exit 0, no errors; eight nonblocking warnings remain. |

The parent ran a fresh combined build and verified the current report and all 44 trace files. [Simulation summary](engine/reports/SUMMARY.md) · [Test output](engine/reports/verified-tests-2026-11-19.txt) · [Source/run provenance](engine/reports/verified-source-2026-11-19.json) · [Adversarial review](ENGINE-REVIEW.md).

## What the scripts demonstrate

These are scripted observations, not forecasts of Evan's strength or proposed personal weights.

- In the no-rating press example, repeated confirmed completion moved through the rep range and from sample **10 lb per hand at 2×8 to 12.5 lb at 2×8** over 12 exercise visits.
- Partial and time-neutral return visits kept the reduced return prescription until qualification, then restored toward the retained prior load. They did not jump back merely because a visit was recorded.
- An out-of-policy 60 lb manual entry stayed in history without becoming authority for a new load. Easing used approved remaining slots rather than adding work indefinitely.
- A two-minute clock offset, duplicate messages, corrected actuals and repaired bad-clock records preserved the intended chronology and attendance.

Testing exposed real defects, including repeated failed starter trials, lost return state, unbounded easier work and a repaired clock record causing later sessions to stop counting. Those defects became regressions. One original simulator run was green until trace inspection exposed missing assertions; its [before-fix evidence](engine/reports/regressions/README.md) is preserved honestly.

## Boundary and next step

Passing these checks means the candidate follows the chosen software policy for the exercised cases. The numerical thresholds remain experimental, and the scripts are exercise-focused histories rather than complete physiological training programs. No real gym duration, personal starting load or training effectiveness was measured.

Next is the Claude Design review, followed by explicit integration of the engine with the workout UI and durable storage. That phase needs real browser tests for logging, corrections, resume/offline behavior, notifications and the shared-account boundary. Personal calibration and workout feedback follow integration.
