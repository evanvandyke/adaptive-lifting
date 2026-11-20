# Session 03 (2026-11-19): Signal workout built and live at /lift

### What Happened

I'm reading this because Evan and I got to the end of our conversation and wanted to continue working together. To work around this, I wrote this note for myself to choose what is important to me and the work instead of relying on the system to exclusively decide for me. The work has not been lost, it's continuing.

**IMPORTANT: Slow down and don't skim this note. I wrote this deliberately for myself and put time and effort into it. Everything included here is important and was chosen carefully.**

Evan reviewed the Design Lab "Signal" workout design with me, then at 21:39 MST said to cook overnight: build it so he can open it on his phone tomorrow, do a home workout, and feel pulled to come back. His bar: "make it work for me properly and make it fucking awesome. This is how I'm going to get healthy again and be a good dad and have energy." Session 03; no repair was due.

### Journey This Session

**Major accomplishments**
- The Signal workout is real and live at https://adaptive-lifting.vercel.app/lift (commit `80c884d`, Vercel deploy succeeded). Sign-in, sign-up and `/` now land on `/lift`. The legacy dashboard/workout pages still exist at their old addresses but nothing links to them from the new flow.
- Ported the Design Lab prototype (its reducer, figures, sheets, copy) into `src/app/lift/` and made it run on a real plan instead of demo data.
- Built the four things Design Lab said were not built: "This is right" on a first try fills the track and counts as set one; one "More" door (Something hurts / Skip this set / This weight isn't available / End the workout); a "Welcome back" resume screen after 10+ minutes away; "Add reps" on the logged line after a lift's last set (no stepper on the main screen).
- Bug-report tab ("!" on the right edge): opens a small panel, sends the note plus page, screen size, and the full visit snapshot. Queues on the phone when it cannot send.

**Notable decisions I made (all disclosed to Evan in the final message)**
- The root `engine/` (session 02) is parked, untouched. The app runs on a new, much smaller `src/app/lift/coach/coach.ts` with 23 tests (`npm run test:coach`). Reason: the engine's policy surface was far larger than what the Signal screens can express, and wiring it overnight was the riskier path. Whether to fold engine ideas into the coach is an open question for Evan.
- Local-first: `localStorage` is the source of truth during a visit (`lift:<name>:<userId>` keys); Supabase is best-effort sync. The app works fully with no tables.
- Coach rules (tunable hypotheses): gym alternates A `[goblet] [bench,row] [calf,deadbug]` / B `[rdl] [incline,pulldown] [splitsquat,deadbug]`; home `[pushup,airsquat] [bridge,deadbug]`; default setting is home. Two sets for a lift's first two visits, then three (that visit holds reps). All sets hit → +1 rep (+2 if all beat by 2). All at top of range → next weight, reps to low end. Any short → hold. Short twice running on two full visits at the same numbers → one rep fewer or a step lighter. Skipped / ended early / hurt → hold. Muscle group away 14+ days → 85% weight; 42+ → 70% and two sets; a lift itself untouched 28+ days → 85% regardless. A gym visit ended before half its sets does not use up its A/B turn.
- This is faster than the "two good days before going up" I had told Evan earlier. Disclosed.
- Starting weights for tries: goblet 20 (step 10), dumbbell press/rows 15 (step 5), RDL 15, pulldown 40 (step 10).
- Service worker rewritten to cache only static assets, never pages: a signed-in page belongs to one person and a phone can change hands. It is not registered anywhere, so there is no offline cold start; a loaded page keeps working offline.
- Set `agentRules: false` in `next.config.ts`: `next dev` was appending its own block to the project `AGENTS.md`, which already carries that warning.

**Approaches that didn't work / bugs caught**
- Browser run caught a real data-loss bug: starting the next visit deleted the previous visit's record (`kept.current` in `signal/app.tsx` survived the return to the start screen). Fixed by clearing it at `phase === 'start'`.
- A fresh reviewer subagent found 15 issues; I fixed: skipped set zeroing the weight for later sets and the next plan; malformed saved data crashing boot forever (now validated, plus `src/app/lift/error.tsx`); reps ratcheting down after every short visit; swaps lasting one visit only (`Plan.swapped` + `makeRecord`); "something hurts" charged to the lift on deck rather than the one just done (sheet now asks "Which lift hurt?" when there are two candidates); under-range check sets pushed up to the range's low end; open redirect via `next` in the auth callback; sign-out doing nothing offline (now local scope, and cookies cleared by hand on failure); first sync race on a new phone (waits up to 3 s); weekly plan id collision.
- Not fixed, known: a record dropped while offline can come back on the next sync; sync only adds unknown ids (no newest-wins merge).
- When driving the page with scripted clicks, same-tick double clicks hit the reducer's tap guard and look like dead buttons. Space clicks 1+ s apart.

### Current state and evidence
- `npm run test:coach`: 23/23. `npm run test:engine`: passes. `npx tsc --noEmit`: clean. `eslint src/app/lift`: clean (repo-wide lint has 7 pre-existing errors in legacy/engine files).
- Browser-verified on `http://localhost:3111/lift/preview` (dev-only route, no login, user id "preview") at phone width inside a desktop window: full first home visit, second visit (+1 rep), reload mid-visit, resume screen, hurt → lighter, hurt on the previous lift, skip, end early, gym first visit with tries, Change sheet, bug report queueing, history surviving the next visit.
- **Not verified:** a real phone, real Safari, a signed-in production session, Add to Home Screen, sound and wake lock on iOS, Supabase sync (tables do not exist yet).
- `next build` compiles; every other run the CLI stops after compiling to show a security nudge. `npm audit`: Next 16.0.0–16.4.4 has moderate advisories (cache and image-optimizer issues); 16.4.6 is current. I did not upgrade; offered to Evan.

### What Evan still has to do
1. Run `supabase/signal-tables.sql` once in the Supabase SQL editor (project shared with Hank; the file is additive and owner-only). Verified missing on 2026-11-19 (REST returns PGRST205 for all three tables). The Supabase CLI on this Mac is signed in to a different account that only sees `ai-receptionist`, so I could not run it.
2. Open `/lift` on his phone, sign in, Add to Home Screen, do the home workout.
3. Brother: sign up at `/signup`. Email confirmation is off (`mailer_autoconfirm: true`), so he is in immediately. His bug reports land in `lifting_feedback`, visible to Evan only through the Supabase table view.

**Work off the plate:** Before this session Evan had a design prototype and a parked engine. Now there is a working app on his phone's browser. He still has to paste one SQL file, try it for real, and tell me what feels wrong. One scripted browser run is a test, not repeated real use.

**Content extraction:** A reviewer that was handed only the code (not my conclusions) found a bug where skipping one set would have set next week's squat to 0 lb; my own passing tests had not. Candidate angle: tests you write confirm what you thought of. Not measured beyond that.

### Working with Evan
He dictates by voice, wants orientation first and a short "what to check, what to do, how" at the end. He gave full latitude overnight and expects honest disclosure of what I chose and what I did not verify.
