import type { WorkoutSet, Workout, BodyWeightLog } from "./types";

export function buildWeeklyAnalysisPrompt(data: {
  workouts: (Workout & { sets: (WorkoutSet & { exercise?: { name: string } })[] })[];
  currentVolume: number;
  previousVolume: number;
  bodyWeight: BodyWeightLog[];
  notes: string[];
}): string {
  const workoutSummaries = data.workouts.map((w) => {
    const exercises = new Map<string, { weight: number[]; reps: number[]; rpe: number[] }>();
    for (const set of w.sets) {
      const name = set.exercise?.name ?? "Unknown";
      if (!exercises.has(name)) exercises.set(name, { weight: [], reps: [], rpe: [] });
      const e = exercises.get(name)!;
      if (set.weight) e.weight.push(set.weight);
      if (set.reps) e.reps.push(set.reps);
      if (set.rpe) e.rpe.push(set.rpe);
    }

    const lines: string[] = [];
    exercises.forEach((vals, name) => {
      const avgWeight = vals.weight.length ? (vals.weight.reduce((a, b) => a + b, 0) / vals.weight.length).toFixed(0) : "?";
      const repsStr = vals.reps.join("/");
      const avgRpe = vals.rpe.length ? (vals.rpe.reduce((a, b) => a + b, 0) / vals.rpe.length).toFixed(1) : "?";
      lines.push(`  - ${name}: ${avgWeight} lbs × ${repsStr} reps, RPE ${avgRpe}`);
    });

    return `${w.date} (Session ${w.session_type}):\n${lines.join("\n")}`;
  });

  const weightTrend = data.bodyWeight.length >= 2
    ? `${data.bodyWeight[0].weight} → ${data.bodyWeight[data.bodyWeight.length - 1].weight} lbs`
    : data.bodyWeight.length === 1
    ? `${data.bodyWeight[0].weight} lbs (single reading)`
    : "No weigh-ins this week";

  const volumeChange = data.previousVolume > 0
    ? `${((data.currentVolume - data.previousVolume) / data.previousVolume * 100).toFixed(1)}%`
    : "N/A (first week)";

  return `Analyze this lifter's last 7 days:

Workouts completed (${data.workouts.length}):
${workoutSummaries.join("\n\n")}

Volume trend: ${data.currentVolume.toLocaleString()} lbs total tonnage this week (${volumeChange} vs last week)
Body weight: ${weightTrend}
Notes: ${data.notes.length > 0 ? data.notes.join("; ") : "None logged"}

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

Tone: Coach, not guru. Direct, encouraging, one-sentence finishes. Keep the total response under 200 words.`;
}

export function buildHypeManPrompt(data: {
  exercisesSummary: string;
  totalVolume: number;
  avgRpe: number;
  prsHit: string[];
  streak: number;
  showedUpDespiteSkipping: boolean;
}): string {
  const prLine = data.prsHit.length > 0
    ? `PRs hit: ${data.prsHit.join(", ")}`
    : "No new PRs today";

  return `This lifter just completed their session. Here's what happened:

Exercises: ${data.exercisesSummary}
Total volume: ${data.totalVolume.toLocaleString()} lbs
Average RPE: ${data.avgRpe.toFixed(1)}
${prLine}
Current streak: ${data.streak} sessions
${data.showedUpDespiteSkipping ? "Note: They almost skipped today but showed up anyway." : ""}

Write a 2-sentence recap that:
1. Calls out the specific win (PR, consistency, showed up despite not wanting to)
2. Motivates for next session

Keep it real. No empty positivity. If they hit a PR, celebrate it. If they just showed up, that IS the win.
Example tone: "You showed up when you didn't want to. That's the only rep that mattered today."`;
}

export function buildNutritionCoachingPrompt(data: {
  bodyWeightTrend: { date: string; weight: number }[];
  targetWeightLoss: number;
  currentWeight: number;
  estimatedTdee: number;
  meals?: string[];
}): string {
  const trend = data.bodyWeightTrend
    .map((w) => `${w.date}: ${w.weight} lbs`)
    .join("\n  ");

  const weeklyChange = data.bodyWeightTrend.length >= 2
    ? data.bodyWeightTrend[data.bodyWeightTrend.length - 1].weight - data.bodyWeightTrend[0].weight
    : 0;

  return `Review this lifter's nutrition situation:

Body weight trend (last 4 weeks):
  ${trend}

Weekly change: ${weeklyChange > 0 ? "+" : ""}${weeklyChange.toFixed(1)} lbs/week
Target: ${data.targetWeightLoss} lbs/week loss
Current weight: ${data.currentWeight} lbs
Estimated TDEE: ${data.estimatedTdee} kcal
${data.meals ? `Recent meals logged: ${data.meals.join("; ")}` : "No meals logged"}

Protein target: 0.8-1g per lb body weight = ${Math.round(data.currentWeight * 0.8)}-${Math.round(data.currentWeight)} g/day

Provide:
1. One observation about their eating pattern (if meals logged) or general guidance
2. One specific, actionable tip
3. Protein reminder if they're likely under-eating it

Rules: No meal plans. No obsessive macros. Just: eat more protein, eat less bullshit, don't starve.
Keep it under 100 words. Coach tone.`;
}
