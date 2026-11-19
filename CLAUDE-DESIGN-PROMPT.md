Design the UX and UI for **Adaptive Lifting**, a phone-first strength-training app. Give it a fresh visual identity and create a convincing, interactive design prototype using the capabilities available to you. Build an isolated prototype with mock data; connecting existing accounts, workout records and production services belongs to later implementation.

You have creative ownership of the visual direction: typography, palette, light or dark theme, navigation, layout, illustration, motion and component style. Choose a coherent direction and show it. Make reasonable design decisions rather than opening with a style questionnaire. The requirements below describe what the experience must accomplish; you decide how it should look and feel.

## What the app is

The product promise is: **the app decides what comes next; I show up, lift, confirm what happened, and leave.**

The primary user has lifted before but is starting again from a fresh training baseline. The goal is to rebuild strength and a sustainable habit with very little planning or phone attention during a workout.

- Plan around three visits per week and roughly 30 minutes per normal gym visit, including preparation and rest.
- A full gym is the primary setting, with free weights preferred and machines available when useful.
- Workouts use a rotating sequence rather than depending on fixed weekdays. They combine priority lifts and sensible supersets: alternating between two exercises, with appropriate recovery.
- A smaller bodyweight option covers a day or week when the gym is unavailable.
- The app supplies exercises, weights and rep targets, then adapts future guidance from confirmed performance and context.
- Early visits establish manageable starting points and can contain fewer exercises than an ordinary workout. The user does not need to know a one-rep maximum.

BAU5 inspired the guided workout concept; compound-focused strength training informs the program. Create an original design. The specific training algorithm is our own work in progress, not a known BAU5 formula.

## The experience to prioritize

**1. Open and start.** After initial setup, show the next workout's focus, approximate duration and a clear way to start. The normal path should require no daily planning decisions. Provide occasional adjustments such as less time or “No gym today.” Resume an ongoing visit clearly.

**2. Prepare and lift.** Make the current exercise, weight, target reps and set position easy to understand at a glance. Distinguish warm-ups, calibration and working sets. Show equipment setup where helpful, including a plate arrangement for a barbell. Keep exercise demonstrations and concise technique cues available on demand.

**3. Confirm what happened.** Prefill the intended weight and reps. Give both weight and rep counts generous **minus/plus controls** for fast corrections. Use actual available equipment increments. Make units unmistakable: pounds versus kilograms, total bar weight versus weight per dumbbell, and reps per side where applicable. Design how unequal left/right reps can be recorded without burdening the usual equal-reps case.

One deliberate completion action records an ordinary set. Make the count being confirmed visible before that action, and make undo or correction easy. Planned values become actual results only when confirmed. Suggested limits guide the workout; corrections must still capture what actually happened. The app does not sense reps automatically. You may choose the completion interaction; make it reliable with tired, sweaty hands.

**4. Recover and prepare for what is next.** After confirmation, show rest guidance and the upcoming exercise, load and setup together. Make superset order obvious so the user can move between exercises without thinking about the sequence. Offer pause and more rest. Rest ending means ready; it neither records a set nor makes the user overdue. Optional sound or vibration should have a visual fallback when unavailable.

**5. Finish.** Show what was actually completed and a concise, credible progress observation. Recognize partial or calibration visits clearly. Leave without a mandatory survey. Keep history and progress easy to revisit outside the active workout.

## Important variations

- **First visits:** communicate that weights are provisional and the app is learning a baseline. Show bounded calibration, optional Easy / Manageable / Too hard feedback, and a way to finish calibration later. The experience should support controlled practice, without asking the user to exhaust themselves to establish a number.
- **Last-set extras:** on eligible established exercises, the user can choose extra controlled reps. Use plain “Last set” language. Show the target and optional limit clearly, and record the actual count with the same familiar controls. Completing the ordinary target remains a valid result; effort ratings and extra reps are optional.
- **A difficult day:** show an understandable adjustment to upcoming work, with a short reason when useful. A bad day and a longer-term change are different. Keep a load already prepared for lifting stable until a changed proposal is acknowledged.
- **Equipment problems:** support unavailable weights, an occupied station, switching to straight sets or an eligible replacement exercise. Preserve completed work. A replacement has its own loading history; visually similar movements do not automatically use the same weight.
- **Discomfort or interruption:** make stopping the affected movement easy. Offer skip, pause or end-early controls without making the user navigate a lengthy form. A context question can be optional and should not repeat after every set in the same event. Unperformed sets stay unperformed.
- **Home workout:** make “No gym today” an easy override, with an option to stay in home mode until switching back. Show bodyweight reps and variations rather than a misleading zero-pound workout. A sample home session pairs push-ups with air squats, then glute bridges with dead bugs. Explain briefly that this floor-only option does not cover loaded pulling. Preserve the next gym workout and its history.
- **Return after time away:** explain a proposed return plan while preserving historical records. An old unfinished visit should be distinguishable from today's visit, rather than silently combining them.
- **Offline or interrupted use:** design states for work saved on the phone, pending synchronization, a failed save and a plan unavailable offline. Reopening should restore the current position. Repeated taps or retries must not appear to create duplicate sets. In the prototype, clearly distinguish simulated persistence from any functionality you actually implement.

## Design for a real gym

The user may be breathing hard, holding the phone in one hand, dealing with glare and touching the screen with sweaty fingers. Attention belongs on the exercise.

- Use large, well-separated thumb controls. Roughly 48–56 CSS pixels is a useful starting point for touch targets; make primary controls larger where helpful.
- Make the key numbers readable at a glance, with clear hierarchy and strong contrast.
- Convey state through text, symbols and contrast as well as color. The interface must work for someone with partial colorblindness.
- Keep the normal workout path short and predictable. Place secondary information and uncommon choices where they are available without competing with the current set.
- Make destructive or accidental actions recoverable. Favor deliberate confirmation with easy correction over repeated confirmation dialogs.
- Support text enlargement, labelled controls, keyboard/screen-reader access and reduced motion. Avoid relying on hover or precise gestures.
- Design for a mobile web/PWA context. Device-specific features should have usable fallbacks.
- Use plain, direct language and restrained encouragement. Explain changes without displaying training equations or technical implementation details during a workout.

The active workout is the center of the product. Organize onboarding, the next-workout view, history/progress and settings around making that experience work. Broader features such as nutrition or progress photos can remain secondary; they are not required for this design exercise.

## Program context and prototype data

The current planning draft uses an alternating full-body A/B rotation. An ordinary session begins with one priority lift performed separately, followed by two superset pairs, generally starting with two working sets per exercise. Think about ten working sets once those movements have been established. First visits can be smaller. More exercises or sets depend on actual time and recovery, not a compulsory quota.

You can use this example to make the prototype internally consistent:

- A: squat; dumbbell bench press + supported row; calf raise + dead bug.
- B: dumbbell Romanian deadlift; incline dumbbell bench press + pulldown; split squat + dead bug.

These are draft program examples, not constraints on the visual design. Show estimated duration as approximate and responsive to preparation, rest and changed plans.

Some engine policies are still being defined: exact first loads, larger equipment jumps, cumulative increases and return-after-gap loads. **Use explicitly labelled sample data and scripted transitions for the prototype.** Choose consistent demonstration values and a mock equipment inventory rather than inventing a supposedly validated training formula. Keep the demo label in the prototype context so the actual product screens remain understandable. Represent an increased target, a held target, an easier prescription and a provisional starting load without requiring a live AI service or backend.

## What to deliver

1. One coherent, opinionated UX/UI direction with a brief explanation of the important design choices.
2. A polished interactive prototype centered on one complete gym session: preview, preparation, set adjustment, confirmation, rest, superset transition and completion. Make the controls genuinely interactive where your environment supports it.
3. Supporting designs or reachable states for first-use calibration, a home workout, equipment trouble, discomfort/ending early, correcting a completed set, offline save/reopen and returning after a gap. Clearly identify anything shown only as a static state.
4. A compact design-system handoff covering typography, color, spacing, controls, accessibility and reusable components. Include editable/exportable assets or source if available.

Check the design with these walkthroughs before presenting it: complete a set as planned; correct both weight and reps; record unequal per-side reps; decline extra reps; extend rest; switch an occupied superset station; stop early; reopen a partially completed workout; and select a home session. Show where each action lives and what changes afterward.

Optimize for this reaction: **“I always know what to do next, and recording it barely interrupts the workout.”**
