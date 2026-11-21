# Adaptive Lifting: intro explainer brief

**Read this first.** This is raw material for an intro video, written by the session that built the app. It is accurate about how the app works today. It is not finished copy, not a script, and not doctrine. Your job is to make it better: sharper words, a real storyline, a storyboard, jokes that land. Change anything about the telling. Keep the facts in "What is true" true, and check them against the code if a line in the video depends on one (`src/app/lift/coach/coach.ts` holds the rules).

## Who the video is for

Someone opening the app for the first time: Evan, his brother, later maybe a friend. They may not have lifted in a year. They do not want a lecture. In about a minute they should know what the app does, what they have to do, and that it is going to be all right.

## The one idea

You show up and lift. The app decides what comes next.

## What is true (the facts)

**What it is**
- A workout app that runs in the phone's browser and saves to the home screen like an app.
- It walks you through one set at a time. One big button. No menus to study between sets.
- A little yellow lifter shows each movement.

**What a workout looks like**
- Three visits a week.
- Home workout: push-ups, air squats, glute bridges and dead bugs. No equipment.
- Gym workout: two workouts, A and B, that take turns. A is goblet squat, dumbbell flat press, supported row, calf raises, dead bugs. B is Romanian deadlift, incline press, lat pulldown, split squat, dead bugs.
- You pick home or gym; you can switch any day.
- The start screen says roughly how long today takes and how many sets.

**The adaptive part (why it is called that)**
- You tell it what you did: the reps you got on each set. That is all the tracking there is.
- Hit every set at the target, and next time it asks for one more rep. Beat every set by two, and it asks for two more.
- Reach the top of the rep range on every set, and next time the weight goes up and the reps drop back to the low end. Then you climb again.
- Fall short on a set, and next time you get the same numbers again. No penalty.
- Fall short two visits running, and it eases off: one rep fewer, or a step lighter.
- A new lift starts with two sets. After two visits it becomes three.
- The first time you do a weighted lift, it has you try a weight and say whether it is right, so it starts where you actually are.

**When life happens**
- Something hurts: say so, and it goes lighter or swaps the movement. That lift holds its numbers next time.
- Skip a set, end early: fine. Same numbers next time.
- Gone two weeks or more: it brings you back at 85 percent. Gone six weeks or more: 70 percent and back to two sets. It does this per muscle group, so skipping legs for a month does not reset your pressing.
- Put the phone down mid-workout for ten minutes or more: it greets you with "Welcome back" and picks up where you were.
- The weight you want is taken: tell it, and it works around that.

**What to expect**
- The first visits feel easy. That is on purpose. The plan is built for someone coming back, and the goal of week one is week two.
- Progress is small and steady: a rep here, five pounds there. The app keeps count so you do not have to.
- Your workouts save on your phone as you go and sync to your account, so a dead signal in the gym does not lose anything.
- There is a "!" tab on the right edge. If anything feels wrong, tap it and say so. That note goes straight to Evan.

## What it is not

- Not a bodybuilding program, not a diet plan, not medical advice.
- Not a tracker with charts to admire. It has one job: tell you the next set.
- The numbers above (85 percent, two-then-three sets, three visits a week) are the current settings. They are sensible starting guesses that will be tuned as real workouts come in. Say "about" in the video; do not promise exact figures.

## Tone Evan asked for

Funny. A big, loud, lovable 1980s bodybuilder energy: the kind of coach who claps his hands and announces that everyone is about to get pumped. A headband is encouraged. The joke is the contrast: the voice is enormous and the app is calm and tiny. The app itself never shouts; its own words are short and plain ("One set at a time."). Keep the humor warm, never mocking the person who is out of shape.

Use an original character voice. Do not imitate a real person's voice or use a real person's name or likeness.

## A first-pass story (replace freely)

1. **Cold open.** The little yellow lifter stands alone on black, looking at a barbell. The big voice bursts in, wildly over-excited about getting pumped. The lifter flinches.
2. **The problem.** The voice starts listing everything a normal program makes you decide: sets, reps, weights, splits, percentages. Numbers pile up on screen and bury the lifter.
3. **The turn.** One yellow button pushes the pile away. "Or. You press Start."
4. **How it works.** The lifter does a set. A number ticks up by one. Does another visit. A plate slides onto the bar by itself. The voice is amazed that nobody had to do math.
5. **Life happens.** The lifter vanishes for two weeks (calendar pages, a couch). Comes back sheepish. The bar quietly gets a little lighter. The voice, gently for once: it knows. It adjusted.
6. **The promise.** Show up. Lift. It handles the rest. Lifter locks out the bar overhead, which is the app icon. Headband appears.
7. **End card.** "Adaptive Lifting. One set at a time."

## Materials

- Character poses, frames, colors and construction rules: `design/intro-video/characters/` (start with its `README.md` and `character-sheet.png`).
- App icon and wordmark: `public/icons/icon.svg`, `public/brand/wordmark.svg`.
- Colors: yellow `#ffc800`, ink `#1c1a14`. Font: Overpass, weights 600, 800, 900.
- The live app, to see it move: https://adaptive-lifting.vercel.app/lift

## Where the finished video may go

On the sign-in page, or as a short "how this works" a new person sees once after signing up. That is undecided; make it work as a standalone clip of about a minute.
