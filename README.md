# Adaptive Lifting

**Show up. Get stronger. Don't quit.**

A strength-training PWA being redesigned around guided workouts, confirmed performance and adaptive prescriptions. Built for someone returning to lifting, with consistent participation and low phone friction as the priorities.

## Current implementation boundary

The existing workout flow in this repository is the original application: it seeds weights from previous completed sets and stores progression advice as text. The separate legacy `calculateProgression` function is not called by that flow. The original feature inventory and training tables below describe that build and its intended rules, not the new engine.

The isolated candidate lives in [`engine/`](engine/README.md). Its pure functions cover prescriptions, calibration, progression, visit planning and event replay. It has no connection to the live workout UI, authentication or Supabase writes. Use [`ENGINE-SPEC.md`](ENGINE-SPEC.md) for its exact experimental policy, [`ENGINE-REVIEW.md`](ENGINE-REVIEW.md) for review status, and the [latest simulation report](engine/reports/SUMMARY.md) for the executed snapshot and limitations. A passing software check does not establish training effectiveness or physical suitability.

Run `npm run check:engine` for a fresh compile, behavior tests and scripted histories. `npm run test:engine` and `npm run simulate:engine` run the two validation parts separately. The runner adds no dependencies and makes no live-service calls.

The product flow is in [`GYM-EXPERIENCE.md`](GYM-EXPERIENCE.md), confirmed preferences in [`PROGRAM-DIRECTION.md`](PROGRAM-DIRECTION.md), and the visual-design handoff in [`CLAUDE-DESIGN-PROMPT.md`](CLAUDE-DESIGN-PROMPT.md). Exercise examples in [`TRAINING-PLAN.md`](TRAINING-PLAN.md) provide planning context; the engine specification and code own the candidate's exact transitions.

## What It Does

- **Tells you what to lift today** — Session A/B rotation with auto-populated weights
- **Stores progression guidance** — the legacy flow records RPE-based advice; automatic application of the new prescriptions requires a later integration
- **Tracks if you're getting stronger** — PR detection, volume trends, streak tracking
- **Reminds you why you started** — AI-powered post-workout hype and weekly analysis
- **Keeps nutrition dead simple** — Protein counter with quick-tap buttons. No calorie counting hell.

## Legacy progression design

The original RPE-based design drew inspiration from BAU5 and compound-focused training. The table records that earlier intent; it is not the standalone candidate's implemented policy or a validated reconstruction of either training system.

| Condition | Action |
|-----------|--------|
| All reps hit, RPE ≤ 8 | +2.5 lbs upper body, +5 lbs lower body |
| All reps hit, RPE 8.5-9 | Hold weight — build capacity |
| Missed reps or RPE 10 | Reduce weight 10%, rebuild |
| Missed reps 2 weeks straight | Deload week: drop 20%, keep reps |

The original design also proposed a three-week onboarding phase. Current first-use, return and load-change policies are defined separately in the engine specification.

## Features

**Training**
- 3x/week full-body A/B split (Squat/Bench/Row/OHP/Plank and Deadlift/Incline/Pull-ups/DB Rows/Leg Raises)
- Warm-up set generator (bar → 50% → 75% → working weight)
- Plate calculator with visual barbell diagram
- Rest timer with audio/vibration notifications (90s compounds, 60s accessories)
- RPE guide explaining the 1-10 scale
- Auto-fill reps and weight on set completion

**Intelligence**
- Weekly AI analysis (stall detection, fatigue signals, recovery gaps)
- AI exercise swap suggestions when a lift stalls for 2+ weeks
- AI nutrition coaching (analyzes protein intake + weight trends)
- Post-workout hype-man notifications
- PR detection and celebration
- Progression recommendations stored per exercise

**Body Composition**
- Body fat % estimation using the Navy Method (weight, waist, neck)
- Lean mass vs fat mass breakdown
- BF% trend sparkline over time
- No calipers or fancy equipment needed

**Motivation**
- Streak tracker (workouts this week, consecutive sessions)
- Shareable PR cards (Instagram story format, download or copy to clipboard)
- Win notifications for PRs
- Accountability nudges for missed sessions
- Progress charts (strength curves, body weight, volume trends)

**Nutrition**
- Daily protein target (0.8g per lb bodyweight)
- Quick-tap buttons (+20g chicken, +30g shake, +15g eggs, +10g yogurt)
- 7-day protein bar chart
- AI coaching that analyzes your patterns and gives actionable advice
- No meal plans. No obsessive macros. Just: eat more protein, eat less bullshit, don't starve.

**Periodization**
- Training phase tracker (Neural Adaptation → Linear Progression → Volume Accumulation → Ready to Split)
- Shows current week and what's happening physiologically
- 4-day upper/lower split templates for when you're ready to graduate from 3x full-body

**Design**
- Dark glassmorphism UI with living aurora background
- Mobile-first — built for the gym with sweaty fingers
- PWA with offline support and home screen install
- Teal/amber/velvet color palette

## Tech Stack

- **Frontend:** Next.js 16 (App Router, Server Components, Server Actions)
- **Database:** Supabase (Auth, PostgreSQL with RLS, real-time)
- **AI:** Claude API (Anthropic) for weekly analysis and motivation
- **Styling:** Tailwind CSS with custom glassmorphism design system
- **Hosting:** Vercel
- **PWA:** Service worker, Web App Manifest, offline caching

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- An Anthropic API key (for AI features)

### Setup

1. Clone the repo:
```bash
git clone https://github.com/evanvandyke/adaptive-lifting.git
cd adaptive-lifting
npm install
```

2. Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
ANTHROPIC_API_KEY=your_anthropic_key
```

3. Set up the database — run the migrations in your Supabase SQL editor. The schema includes tables for profiles, workouts, sets, exercises, streaks, progressions, body weight logs, calibration, nutrition, and body composition. All tables are prefixed with `lifting_` and have RLS enabled.

4. Start the dev server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) and create an account.

## Default Program

### Session A (Mon/Fri on odd weeks, Wed on even weeks)
| Exercise | Sets x Reps | Type |
|----------|-------------|------|
| Squat | 3x5 | Heavy |
| Bench Press | 3x5 | Heavy |
| Barbell Row | 3x8 | Moderate |
| Overhead Press | 3x8 | Moderate |
| Plank | 3x30-60s | Core |

### Session B (Wed on odd weeks, Mon/Fri on even weeks)
| Exercise | Sets x Reps | Type |
|----------|-------------|------|
| Deadlift | 3x5 | Heavy |
| Incline Bench | 3x8 | Moderate |
| Pull-ups/Lat Pulldown | 3x8-10 | Moderate |
| Dumbbell Rows | 3x10 | Moderate |
| Hanging Leg Raises | 3x10-15 | Core |

## How It Was Built

This entire application was built in a single Claude Code session using parallel Opus sub-agents:

1. **Scaffolding** — Next.js project setup, Supabase schema, design system
2. **Parallel build** — 3 Opus agents simultaneously built auth, workout UI, and dashboard
3. **Integration** — AI layer, progression engine, motivation system, PWA setup
4. **Testing** — Full E2E test via browser automation, bug fixes
5. **Enhancement** — Research-backed algorithm update, plate calculator, warm-up sets, nutrition tracker
6. **Phase 4** — Body composition, AI coaching, PR sharing, periodization planner

Total: 52 TypeScript files, ~8,300 lines of code, 9 Supabase tables, 15 routes, 4 AI endpoints. All four build phases completed in a single session.

## Philosophy

This app is not about being perfect. It's about showing up 3x/week, lifting progressively heavier, eating more protein than you are now, and not quitting when the scale doesn't move for 2 weeks.

The app's job is to:
1. Tell you what to lift today
2. Track if you're getting stronger
3. Remind you why you started when you don't feel like going

The rest is on you.

## License

MIT

---

*Built with [Claude Code](https://claude.ai/claude-code) by Anthropic*
