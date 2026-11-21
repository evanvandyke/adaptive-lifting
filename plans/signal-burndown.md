# Signal workout: burn-down

Everything still open on the live workout at `/lift`. Work top to bottom inside a section; delete a line when it is done. New findings from real workouts go at the top of "From real use".

## From real use (Evan's phone, his brother's phone)

- [ ] First gym visit by Evan's brother: watch the first-time home or gym question, the "try a weight" flow, and whether the starting weights are sane.
- [ ] Feedback about what the app asked for (too easy, too hard, wrong weight, wrong order) is coach tuning: log it and work it in `plans/coach-and-engine.md`.
- [ ] Anything sent through the "!" tab: read `lifting_feedback` in the Supabase table view before each session.

## Never checked on a real phone

- [ ] Add to Home Screen on iOS: icon, name, opens full screen, stays signed in.
- [ ] Sound and the screen staying awake during a visit on iOS Safari.
- [ ] A full visit signed in on production: finish it, then confirm a row lands in `lifting_signal_visits`.
- [ ] Second phone or browser, same account: history arrives, the next plan matches.
- [ ] Reload mid-visit, phone locked 10+ minutes ("Welcome back"), visit left overnight.
- [ ] Larger text setting, reduced motion, and one-handed reach of every control.

## Known gaps in saving and syncing (`src/app/lift/store.ts`)

- [ ] A visit record removed while offline can come back on the next sync. It needs a remembered deletion.
- [ ] Sync only adds visits the phone has never seen; there is no newest-wins merge for a visit edited on two devices.
- [ ] A failed save to the phone (storage full, private mode) is silent. Show it.
- [ ] Nothing on screen says "saved on this phone" versus "saved to your account".
- [ ] No offline cold start: `public/sw.js` exists and is registered nowhere. Decide: register it, or remove it.

## Behavior to decide, then build or drop

- [ ] Fixing an earlier set (not just the last one), and fixing a weight.
- [ ] Unequal left and right reps on per-side lifts.
- [ ] A "short on time today" option and a plain straight-sets fallback.
- [ ] Looking back at past visits and progress outside a workout.
- [ ] A visit left more than six hours is closed silently; `docs/product/GYM-EXPERIENCE.md` asks for one confirmation.
- [ ] Measure real visit length against the start screen's estimate (45 s a set, 150 s setup).

## Housekeeping

- [ ] Root layout blocks pinch-zoom (`maximumScale: 1`, `userScalable: false` in `src/app/layout.tsx`); the sign-in pages allow it. Decide for Signal and make them agree.
- [ ] Next.js is 16.4.3; session 03 recorded moderate advisories fixed in 16.4.6. Upgrade and re-run the checks.
- [ ] `npx eslint` across the whole repo, now that the old pages are gone: clear what remains or scope the lint script.
- [ ] `scripts/generate-icons.js` makes only the 192 and 512 icons; fold in the 180 home screen icon and `favicon.ico` so one command rebuilds all of them from `public/icons/icon.svg`.
- [ ] Intro video: another session is making it from `design/intro-video/`. When Evan has the file: `npm run intro:add -- <file>`, look at `/login` locally, commit `public/intro/` and `src/app/(auth)/intro-video.ts`, push, check the live sign-in page. The slot is built and switched off until then.
