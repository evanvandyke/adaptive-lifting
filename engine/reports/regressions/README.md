# Preserved regression evidence

`clock-void-before.json` preserves history 37 from the initial engine run `adaptive-lifting-engine-eO7aG6`. The original script exited 0, but subsequent trace inspection found that a voided bad-clock record caused valid later issuance to lose authority. Attendance stopped after visit 5 and later visits incorrectly entered return handling. The missing post-void invariants were added, the historical snapshot reference closure was repaired, and later runs verified continued attendance and usable work.

The original trace's generated status describes the insufficient checks that ran at that time; it is NOT a passing verdict after the audit. Treat this as the before-fix counterexample. Its embedded hash/run provenance is unchanged. Current results are in `../SUMMARY.md` and `../latest.json`.

Full run archives remain on disk under `../runs/` and are excluded from Git to avoid duplicating every full trace set. The scenario runner can regenerate all 40 histories. Latest complete traces remain tracked alongside the summary; no archived evidence was deleted.
