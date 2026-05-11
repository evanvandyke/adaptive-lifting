import type { WorkoutSet } from "./types";

export interface ProgressionResult {
  action: "increase" | "hold" | "decrease" | "deload";
  weightChange: number;
  reason: string;
}

export function calculateProgression(
  exerciseName: string,
  sets: WorkoutSet[],
  previousSessions: WorkoutSet[][],
  weeksTraining: number = 99
): ProgressionResult {
  if (sets.length === 0) {
    return { action: "hold", weightChange: 0, reason: "No data" };
  }

  const completedSets = sets.filter((s) => s.completed && s.reps && s.rpe);
  if (completedSets.length === 0) {
    return { action: "hold", weightChange: 0, reason: "No completed sets" };
  }

  const avgRpe = completedSets.reduce((sum, s) => sum + (s.rpe ?? 0), 0) / completedSets.length;
  const allRepsHit = completedSets.every((s) => (s.reps ?? 0) >= getTargetReps(s));
  const isUpperBody = ["Bench Press", "Overhead Press", "Incline Bench"].includes(exerciseName);
  const isOnboarding = weeksTraining <= 3;

  // Anatoly/BAU5 principle: upper body progresses slower than lower
  // Research-backed: 2.5 lbs upper, 5 lbs lower (halved during onboarding phase)
  const standardIncrement = isUpperBody ? 2.5 : 5;
  const increment = isOnboarding
    ? (isUpperBody ? 2.5 : 5)
    : (isUpperBody ? 2.5 : 5);

  // During onboarding (weeks 1-3): neural adaptation phase
  // Cap at RPE 7, use reduced increments, skip deload logic
  if (isOnboarding) {
    if (allRepsHit && avgRpe <= 7) {
      return {
        action: "increase",
        weightChange: increment,
        reason: `Week ${weeksTraining} — building base. Adding ${increment} lbs.`,
      };
    }
    if (allRepsHit && avgRpe > 7) {
      return {
        action: "hold",
        weightChange: 0,
        reason: `Week ${weeksTraining} — RPE ${avgRpe.toFixed(1)} is high for the base phase. Hold weight, focus on form.`,
      };
    }
    return {
      action: "hold",
      weightChange: 0,
      reason: `Week ${weeksTraining} — building base. Keep this weight and nail the reps.`,
    };
  }

  // Normal progression (week 4+)
  // Research: RPE 7-8 is the sweet spot for working sets
  // Anatoly trains most sets at RPE 7-8, saves RPE 9-10 for PRs
  if (allRepsHit && avgRpe <= 8) {
    return {
      action: "increase",
      weightChange: standardIncrement,
      reason: `All reps hit at RPE ${avgRpe.toFixed(1)} — adding ${standardIncrement} lbs`,
    };
  }

  if (allRepsHit && avgRpe > 8 && avgRpe <= 9) {
    return {
      action: "hold",
      weightChange: 0,
      reason: `RPE ${avgRpe.toFixed(1)} — solid effort. Hold weight and build capacity here.`,
    };
  }

  // Check for deload before decrease (2 consecutive weeks of misses)
  const consecutiveMisses = checkConsecutiveMisses(exerciseName, previousSessions);
  if (consecutiveMisses >= 2) {
    const currentWeight = completedSets[0]?.weight ?? 0;
    const deloadWeight = Math.round(currentWeight * 0.2 / 5) * 5;
    return {
      action: "deload",
      weightChange: -deloadWeight,
      reason: `Stalled 2 sessions in a row — deload week. Drop ${deloadWeight} lbs, keep reps, rebuild.`,
    };
  }

  const missedReps = completedSets.some((s) => (s.reps ?? 0) < getTargetReps(s));
  if (missedReps || avgRpe >= 10) {
    const currentWeight = completedSets[0]?.weight ?? 0;
    const reduction = Math.round(currentWeight * 0.1 / 5) * 5 || 5;
    return {
      action: "decrease",
      weightChange: -reduction,
      reason: `Missed reps or maxed out — drop ${reduction} lbs and rebuild`,
    };
  }

  return { action: "hold", weightChange: 0, reason: "Maintain current weight" };
}

function getTargetReps(set: WorkoutSet): number {
  return 5;
}

function checkConsecutiveMisses(
  exerciseName: string,
  previousSessions: WorkoutSet[][]
): number {
  let misses = 0;
  for (const session of previousSessions.slice(-2)) {
    const exerciseSets = session.filter(
      (s) => s.exercise?.name === exerciseName && s.completed
    );
    const missed = exerciseSets.some(
      (s) => (s.reps ?? 0) < getTargetReps(s)
    );
    if (missed) misses++;
  }
  return misses;
}

export function calculateVolume(sets: WorkoutSet[]): number {
  return sets.reduce((total, s) => {
    if (!s.completed || !s.weight || !s.reps) return total;
    return total + s.weight * s.reps;
  }, 0);
}

export function checkVolumeDropDeload(
  currentVolume: number,
  previousVolume: number
): boolean {
  if (previousVolume === 0) return false;
  const drop = (previousVolume - currentVolume) / previousVolume;
  return drop >= 0.15;
}

export function generateWarmupSets(workingWeight: number): { weight: number; reps: number }[] {
  if (workingWeight <= 45) return [];
  if (workingWeight <= 65) return [{ weight: 45, reps: 10 }];

  const sets: { weight: number; reps: number }[] = [
    { weight: 45, reps: 10 },
    { weight: Math.round(workingWeight * 0.5 / 5) * 5, reps: 5 },
    { weight: Math.round(workingWeight * 0.75 / 5) * 5, reps: 3 },
  ];

  // Add a heavy single at ~90% if working weight is high enough
  if (workingWeight >= 135) {
    const heavySingle = Math.round(workingWeight * 0.9 / 5) * 5;
    if (heavySingle > sets[sets.length - 1].weight) {
      sets.push({ weight: heavySingle, reps: 1 });
    }
  }

  return sets;
}
