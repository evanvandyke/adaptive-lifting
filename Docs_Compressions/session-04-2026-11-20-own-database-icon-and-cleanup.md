# Session 04 (2026-11-20): Own database, new icon, old app retired

### What Happened

I'm reading this because Evan and I got to the end of our conversation and wanted to continue working together. To work around this, I wrote this note for myself to choose what is important to me and the work instead of relying on the system to exclusively decide for me. The work has not been lost, it's continuing. Evan and I did this to free up room and eliminate lag so we can continue working together in a fresh conversation.

**IMPORTANT: Slow down and don't skim this note. I wrote this deliberately for myself and put time and effort into it. Everything included here is important and was chosen carefully.**

Friday evening, 2026-11-20, about 19:00 to 21:20 MST. Evan came in to run the one SQL file from session 03 so he could lift Saturday morning. It turned into: the app's database moved to a new home, a new icon, restyled sign-in, three start-screen fixes from his first look on the phone, the original app deleted, the docs reorganized, and the materials for an intro video. Session 04; no repair was due.

### Journey This Session

**Major accomplishments**

- **The app has its own Supabase project.** Ref `ljyqtcosoigsribpyiwq`, URL `https://ljyqtcosoigsribpyiwq.supabase.co`, free plan, in a new Supabase account Evan made with a Gmail plus-address (he said "evan.vandyke plus adaptive lifting"; I never saw the exact address). Evan ran `supabase/signal-tables.sql` there himself; I confirmed all three tables answer 200 through the REST API. Confirm email is off (`mailer_autoconfirm: true`, checked through `/auth/v1/settings`), Site URL is `https://adaptive-lifting.vercel.app`.
- **Evan signed up on production with his personal Gmail and landed on the home workout.** That is the first real account on the new database and the proof the chain works.
- **New icon and wordmark, live.** Concept E on yellow: the app's own lifter locking out a loaded bar. `public/icons/icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180), `public/favicon.svg`, `src/app/favicon.ico`, `public/brand/wordmark.svg`. Three rounds of concepts by Codex are kept in `design/app-icon/`.
- **Sign-in and sign-up restyled in the Signal look** (`src/app/(auth)/`, `auth.module.css`), wordmark at the top.
- **Three start-screen fixes from Evan's phone, live:** a first-time "Where are you lifting today?" screen (Home / Gym) shown only when no setting is stored, no history and no saved visit; sound is a speaker icon (waves on, slash and dim off); "Sign out" moved to the top left and always opens a "Sign out?" sheet with "Stay signed in" as the default. Storage key is `lift:setting:<userId>`, absent means never chosen (`src/app/lift/store-setting.ts`, 5 tests).
- **The original app is deleted.** `src/app/(protected)`, `src/app/onboarding`, `src/app/api`, `src/lib`, `src/components` went to the Trash through Finder, with `@anthropic-ai/sdk` and `html2canvas` uninstalled. `/` now redirects to `/login`. The middleware lost its onboarding and `lifting_profiles` branch and gained `/auth/callback` as a public path. `globals.css` is ten lines.
- **Docs reorganized.** Root holds only `AGENDA.md`, `AGENTS.md`, `README.md`. `docs/product/` (GYM-EXPERIENCE, PROGRAM-DIRECTION, CLAUDE-DESIGN-PROMPT), `docs/engine/` (ENGINE-SPEC, -REVIEW, -RESULTS, -TEST-CASES, TRAINING-PLAN, TRAINING-PLAN-REVIEW), `docs/research/`, `archive/` (original README, Implementation-plan, GYM-EXPERIENCE-REVIEW). A script rewrote 169 relative links; `engine/scenarios/run.ts` now reads `docs/engine/ENGINE-SPEC.md`. README and AGENTS.md rewritten to the current state.
- **Three burn-down lists** in `plans/` (`signal-burndown.md`, `accounts-profile-tracking.md`, `coach-and-engine.md`), built from a read-only Codex sweep of every doc for unfinished work. The agenda points at them.
- **Intro video materials** in `design/intro-video/`: `EXPLAINER-BRIEF.md` (facts, tone, a seven-beat first-pass story, marked as raw material and not doctrine) and `characters/` (27 moves at three poses in two colorways as SVG and PNG, 12-frame sequences for victory, dead bug and goblet squat, `rig.json`, `character-sheet.png`, README). Another session of Evan's is making the video.
- **The video slot is built and switched off.** `npm run intro:add -- /path/to/video` (`scripts/add-intro-video.mjs`) shrinks the file with ffmpeg (H.264, 720 on the short side, faststart; a 10.6 MB test clip became 0.7 MB), saves a poster, and writes `src/app/(auth)/intro-video.ts`. The sign-in layout then shows "New here? See how it works." with the player under the form, `preload="none"`. `npm run intro:remove` switches it off. Tested locally with a generated clip, then removed.

**Notable decisions I made**

- **Moved databases instead of using a Google Sheet.** Evan suggested a Sheet with Apps Script. Sign-in also ran through the locked project, so a Sheet would have left login depending on something nobody can fix. The app already speaks Supabase, so moving was two settings.
- **Did not create a test account on production.** The only way to exercise sign-up was to put a junk user in Evan's database; I verified everything around it and let his sign-up be the test.
- **Only the three Signal tables exist in the new project.** The old tables' definitions lived only in the locked project (its REST schema needs a secret key). Evan agreed to abandon the old pages; nutrition was "overkill". He does want body weight and blood pressure later.
- **No example line under FOLLOW-UP.** Evan offered to leave one as a format reminder; the spec says HUD reads every bullet there as a live reminder, so the heading stays empty.
- **New agenda items went into FOR SURE, not UP NEXT,** then Evan approved password reset into slot 1.
- **Reviewer role.** Evan named Codex as builder and no reviewer, so I reviewed every Codex ticket myself: read the diffs, ran the checks, looked in a browser.
- **The explainer brief asks for an original character voice.** Evan wants a loud 1980s-bodybuilder coach with a headband and mentioned a specific actor; the brief keeps the energy and asks the video session not to imitate a real person's voice or name.

**Approaches that didn't work**

- **The Hank Supabase account is gone for good.** Its login was "Continue with GitHub" on a GitHub account (`evan-aperture-os`) Evan has since deleted. Supabase password reset says GitHub is the only way in; GitHub says the email has no account. Hank itself still runs on that project with nobody able to administer it. Supabase support is the only route. This is Hank's problem, not this project's, but Evan should hear it again.
- **Supabase free organizations.** I suggested a free org; Evan already has one ("Playground", four projects, one running) plus "On Hold" and the Pro org "Evan Van Dyke". He chose a fresh account for this app. He is paying for Pro and will not add $10 a month.
- **`printf value | vercel env add` stored something I could not verify,** and sensitive values pull back as empty strings. The fix was `vercel env add NAME production --value "..." --no-sensitive --force --yes`, then `vercel env pull` to confirm. These two values are public by design.
- **A favicon.ico built from RGB PNGs broke the Next build** ("The PNG is not in RGBA format"). Rebuilt with sharp `.ensureAlpha()`. The browser check caught it; tsc and eslint did not.
- **Video files were redirected to login.** The middleware matcher lets image extensions through and did not list `mp4`. Added. Caught by curling the file, before any real video existed.
- **Client bundles on the auth pages contain no Supabase URL** (sign-in is a server action), so grepping live JavaScript cannot prove which project production uses.
- **`next dev` exits on some runs to print an upgrade notice** and asks the agent to offer `next upgrade --agent=security`. Retrying the same command works. Next is 16.4.3; the upgrade is on the Signal burn-down list.

**Content extraction**

- **Work off the plate:** Evan pasted one SQL file, created one Supabase account and project, flipped two auth settings, picked an icon from three sheets, and signed up. Everything else was done for him in about two hours and twenty minutes. He has not yet done a workout in the app; that is still a first use, not repeated use.
- **Method lived:** Mapped (the scout's inventory of junk, dead code, open work and stale docs) before deleting anything; the deletion list came from that map and each "unreferenced" claim had a search behind it.
- **Number measured:** 169 links rewritten (script count); 47 tracked files deleted and 397 added in the big commit (git); test clip 10.6 MB to 0.7 MB (script output); engine run folder confirmed duplicate by comparing 46 of 46 files. Session length is from the clock, not a timer.
- **Proof and permission:** deployed and verified by curl and a desktop browser at phone width; one real sign-up by Evan. His own experience; public telling needs his say-so. The detail about his budget is private.
- **Correction to an earlier note:** session 03 says the Supabase project is shared with Hank and that Evan must run the SQL there. Both are superseded: the app left that project, and the SQL was run in the new one.

### Current State

**Project status**

- Live at https://adaptive-lifting.vercel.app, deployed from `main` by push. Last feature commit before the wrap: `4f035d3`, plus the video-slot commit made at wrap.
- Checks at the end: `npx tsc --noEmit` clean, `npx eslint src` clean, `npm run test:coach` 23/23, `node --test src/app/lift/store-setting.test.ts` 5/5, `npm run test:engine` passes.
- **Not verified:** anything on a real iPhone beyond Evan's sign-up (Add to Home Screen, sound, wake lock, the three new start-screen changes), a finished visit syncing to `lifting_signal_visits`, a second device.
- Evan lifts Saturday morning. He will see the home-or-gym question once, because he has no stored setting and no history.

**The last small job, expected next session**

When Evan's video is ready: `npm run intro:add -- <his file>`, look at `/login` locally, commit `public/intro/` and `src/app/(auth)/intro-video.ts`, push, check the live page. He said he would share the script; he has not yet.

**Setup**

- Vercel CLI is linked (`.vercel/`, project `evan-van-dyke/adaptive-lifting`) and logged in as `evanvandyke`.
- My Supabase connector sees only the Pro org (`aperture-os`); it cannot reach this app's project. Schema changes go to Evan as SQL for the dashboard.
- Codex: `codex exec -s workspace-write --cd <repo> - < brief.md` for builds, `--sandbox read-only` for scouts; model per `~/.codex/config.toml`.
- Headless chrome-devtools at `375x760x2,mobile,touch` for local pages. It refuses to save screenshots outside the workspace; take them inline. `/lift/preview` works with no login in dev; clear `lift:*` keys in localStorage to see the first-time question.

### Working Approach Developed

- Evan decides visual things by eye from a sheet of options at real size, quickly, and explains why in a sentence ("looks like a guy doing the Y in YMCA", "looks like an MP3 waveform"). Three rounds got to a pick he was sure of.
- He thinks out loud and offers alternatives ("you can say no to that"). He wants a recommendation and the reason, and he accepted every no that came with one.
- He is short on money right now and says so plainly. Free tiers only; any monthly cost is his decision before anything is created.
- He batches several asks into one dictated message. Answer each, in his order, and keep building in the background.
- Deletions went through Finder's Trash by `osascript`. One exception I disclosed: a generated font cache removed with `rm`.

### Final status

Repair: not due (session 4). Agenda, memory and commits are recorded in the wrap report in the conversation.
