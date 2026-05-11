# Adaptive Lifting PWA — Implementation Plan (Revised)

## Overview

A progressive web app that auto-adjusts strength training using Anatoly's compound-first principles and BAU5-inspired rules-based progression, enhanced with AI-driven analysis and motivation system. Built for someone returning to lifting after a setback — focuses on **results fast**, **momentum building**, and **no-excuses accountability** rather than optimization perfection.

**Core thesis:** You need to show up 3x/week, lift progressively heavier, eat more protein, and not quit when the scale doesn't move for 2 weeks. The app removes friction and generates wins.

---

## Personal Context & Goals

- **Status:** Previously lifted 3-4x/week at 5-7% body fat; now sedentary (dev work all day), demotivated
- **Goal:** Fast visible transformation, regain strength/physique, high-stakes motivation (personal/dating)
- **Timeline:** Results visible by week 6-12, hooked by week 12+
- **Mindset:** Not competing — trying not to quit. No perfect macros, no meal plans, just: eat more protein, less bullshit, don't starve

---

## Tech Stack

- **Frontend:** Next.js PWA (installable, offline-capable)
- **Database:** Supabase (auth, user data, workout history, body weight logs)
- **AI Layer:** Claude API (weekly analysis, hype-man notifications, nutrition coaching)
- **Hosting:** Vercel

---

## Core Features

### 1. Workout Logging

- Exercise selection (pre-built compound focus, custom additions)
- Set/rep/weight tracking (manual entry)
- **RPE input (1-10 scale)** — captured per set, explicit signal for auto-reg
- Rest timer with notifications
- Notes field (form cues, energy, fatigue)

### 2. Auto-Adjustment Engine (Simple + Smart)

**Rules-based progression (inspired by BAU5, transparent):**

- **Hit all reps at RPE ≤7** → +5 lbs next session (bench/OHP), +10 lbs (squat/deadlift)
- **Hit all reps at RPE 8-9** → weight holds
- **Missed reps or RPE 10** → reduce weight 10%, rebuild

**Deload triggers:**
- Missed reps on same lift 2 weeks in a row → suggest deload week (reduce weight 20%, keep reps)
- Weekly volume drops 15%+ → flag fatigue, suggest deload

**Why simple?** You're not optimizing — you're building momentum. Complex systems kill consistency.

### 3. AI Analysis Layer (Weekly)

Claude analyzes last 7 days and surfaces:
- **Stall detection:** "Your squat is stalling but deadlift climbing — quad weakness. Add goblet squats."
- **Recovery signals:** "RPE spiking across all lifts. You're not recovering. Deload this week."
- **Rep range cycling:** "You've been in the 5-rep range 6 weeks. Switch to 3×8-10 for hypertrophy block."
- **Exercise swaps:** "This movement isn't working. Try this instead."

**Hype-man notifications:** After every session, 2-sentence recap:
> "You showed up when you didn't want to. That's the only rep that mattered today."

### 4. Motivation System (The Part That Actually Matters)

**Removes friction, generates wins:**

- **Streak tracker** — "You've hit 3 sessions this week. Don't break the chain."
- **Win notifications** — "You just squatted 225 for 5. That's a PR. You're stronger than last month."
- **Accountability nudge** — Miss 2 sessions in a row? App pings you: "What's blocking you?"
- **Progress photos** — Weekly selfie upload. Scroll back and see the difference. Visual proof > scale weight.
- **No guilt, no shame** — Just data and forward momentum.

### 5. Fat Loss Integration

**You can't out-train a shit diet.**

- **Weekly weigh-ins** (same day/time) — body weight tracking
- **Estimated TDEE** — based on activity level + weight trend
- **Calorie target** — you set goal (1-2 lbs/week loss)
- **Nutrition logging (optional)** — rough meals ("chicken, rice, broccoli" is enough)

**AI nutrition coaching:**
- Claude flags patterns: "You're skipping breakfast and binging at night. Front-load 40% of calories before 2 PM."
- No meal plans. No obsessive macros. Just: "Eat more protein, eat less bullshit, don't starve."
- **Target:** 0.8-1g protein per lb body weight. Fill the rest with whatever keeps you sane.

### 6. Dashboard

- **Today's workout** (auto-populated with adjusted weights + RPE targets)
- **Progress charts** (strength curve, volume trends, body weight)
- **AI insights card** (top recommendation of the week)
- **Streak counter** (days consistent this week)
- **Deload status** (if triggered)

---

## Default Template: Beginner Reboot (3x/week Full-Body)

**Why 3x/week?**
- Fits your old 3-4x/week habit
- Each session hits everything → faster visual changes
- Miss a day? You still hit everything twice that week
- Minimal effective dose — quality over volume

### Session A

- **Squat:** 3×5 (heavy)
- **Bench Press:** 3×5 (heavy)
- **Barbell Row:** 3×8
- **Overhead Press:** 3×8
- **Plank:** 3×30-60s

### Session B

- **Deadlift:** 3×5 (heavy)
- **Incline Bench:** 3×8
- **Pull-ups/Lat Pulldown:** 3×8-10
- **Dumbbell Rows:** 3×10
- **Hanging Leg Raises:** 3×10-15

### Weekly Rotation

- Week 1: A-B-A (Mon/Wed/Fri)
- Week 2: B-A-B (Mon/Wed/Fri)
- **Repeat indefinitely until ready to advance**

**Accessories:** Minimal. Compounds do 80% of the work. Don't try to win a bodybuilding show in 12 weeks.

---

## Starting Weights & Calibration

**Phase 1 onboarding:**
1. App asks for estimated 1RM or "what can you lift for 5 reps with 2 left in the tank?"
2. Calculate starting weight as ~80% of that number
3. Week 1 is establishing baseline. You'll be sore. Weight might go up (water retention). Ignore the scale.

---

## Timeline to Results

- **Week 1-2:** Baseline established. Heavy soreness. Scale noise. **Trust the system.**
- **Week 3-6:** Strength gains accelerate (neural adaptation). Feel stronger before looking different. **Danger zone** — no visual changes yet, but the system is working.
- **Week 6-12:** Visual changes show. Clothes fit better. Face leaner. Someone notices. **This is where it clicks.**
- **Week 12+:** Gym isn't a chore anymore — it's the part of the day that makes sense. **You're hooked.**

---

## Revised Build Phases

### Phase 1: MVP (1 week)

**Deliverables:**
- Auth (Supabase) + user profile (weight, goal, activity level)
- Workout logging UI (manual weight/reps/RPE input)
- Auto-progression rules (hit reps → weight up)
- Streak tracker + basic win notifications
- Supabase schema

**Schema:**
- `users` — id, email, password_hash, weight, goal, activity_level, created_at
- `workouts` — id, user_id, date, notes, ai_recommendation
- `exercises` — id, name, category (compound/accessory), muscle_group
- `sets` — id, workout_id, exercise_id, weight, reps, rpe, order
- `body_weight_log` — id, user_id, date, weight

### Phase 2: Intelligence (1 week)

**Deliverables:**
- RPE tracking integration (confirm 1-10 scale works per set)
- Volume/tonnage calculations (sets × reps × weight)
- Deload trigger logic (2-miss rule, 15% volume drop)
- Weekly Claude analysis prompt (performance trends → recommendations)
- Hype-man notification system

**New schema:**
- `progressions` — id, user_id, exercise_id, week, avg_weight, total_volume, ai_recommendation

### Phase 3: PWA + Motivation Layer (3-4 days)

**Deliverables:**
- Offline support (cache last 4 weeks of data)
- Install prompt
- Rest timer with notifications
- Accountability nudge system (miss 2 sessions → ping)
- Progress photo upload

### Phase 4: Post-Launch Enhancements

**Deliverables:**
- Nutrition logging (optional, rough meals)
- AI nutrition coaching (Claude analyzes patterns)
- Exercise swap suggestions (AI-driven substitutions)
- Body composition estimates (weight trend + lift performance → estimated body fat %)
- Social proof (share PRs to X/Instagram directly from app)
- Periodization planner (when ready to advance to 4-5 day splits)

---

## AI Prompt Architecture

### Weekly Analysis Prompt

```
Analyze this lifter's last 7 days:

Workouts completed: [list with exercises, weights, reps, RPE]
Volume trend: [total tonnage this week vs. last week]
Body weight: [current weight vs. last week]
Notes: [any user-logged observations]

Identify:
1. Sticking points (exercises plateauing or regressing)
2. Fatigue signals (RPE creep without load increase, volume drops)
3. Form degradation (RPE spikes without weight increase)
4. Recovery gaps (if evident from data)

Recommend:
- Next week's focus (continue strength, shift to hypertrophy, deload, exercise swap)
- Specific exercise substitutions if applicable
- Volume or intensity adjustments
- Recovery/nutrition priority if needed

Tone: Coach, not guru. Direct, encouraging, one-sentence finishes.
```

### Session Hype-Man Prompt

```
This lifter just completed their [exercise] session. They hit [reps/sets/weight] and logged RPE [X].

Write a 2-sentence recap that:
1. Calls out the specific win (PR, consistency, showed up despite not wanting to)
2. Motivates for next session

Keep it real. No empty positivity. Example: "You showed up when you didn't want to. That's the only rep that mattered today."
```

---

## Success Metrics (What Matters)

- **Show up:** 3 sessions/week, 8+ weeks consecutive
- **Get stronger:** Hit progression rules (reps up, weight up, or both)
- **Look different:** Visual changes by week 6-12 (clothes, mirror, photos)
- **Stay hooked:** Want to keep going by week 12+

**Not measured:** Perfect form, optimal macros, periodization mastery, injury-free perfection. This is a reboot, not a PhD.

---

## Technical Notes

- **Offline first:** Works without internet. Syncs when back online.
- **Mobile-optimized:** Session is 30-45 min. Rest timer is key UX.
- **No videos:** Exercises pre-stored as names + cue text. GIFs/videos are Phase 4+.
- **Data export:** CSV at any time. Own your data.

---

## Go/No-Go Decision Points

- **After Phase 1:** Can you log workouts and see auto-progression? If yes, Phase 2.
- **After Phase 2:** Are Claude summaries actually useful? If yes, Phase 3.
- **After Phase 3:** Are people installing it? Are they coming back? If yes, Phase 4.

**If at any point the motivation system isn't working, nuke everything and redesign it. That's the only thing that matters.**

---

## Final Note

This app is not about being perfect. It's about showing up 3x/week, lifting progressively heavier, eating more protein than you are now, and **not quitting when the scale doesn't move for 2 weeks.**

The app's job is to:
1. Tell you what to lift today
2. Track if you're getting stronger
3. Remind you why you started when you don't feel like going

The rest is on you.

**Ready to build. Phase 1 starts now.**
