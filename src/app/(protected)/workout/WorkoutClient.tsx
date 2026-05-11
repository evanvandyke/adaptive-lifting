"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Workout, WorkoutSet, Exercise } from "@/lib/types";
import { SESSION_TEMPLATES } from "@/lib/types";
import ExerciseCard from "./components/ExerciseCard";
import RestTimer from "./components/RestTimer";
import WorkoutSummary from "./components/WorkoutSummary";
import { createWorkout, completeWorkout } from "./actions";
import { RPEGuide } from "@/components/RPEGuide";

interface WorkoutClientProps {
  initialWorkout: Workout | null;
  initialSets: (WorkoutSet & { exercise?: Exercise })[];
  nextSessionType: "A" | "B";
  templateInfo: Record<string, { targetReps: string; isHeavy: boolean }>;
}

export default function WorkoutClient({
  initialWorkout,
  initialSets,
  nextSessionType,
  templateInfo,
}: WorkoutClientProps) {
  const router = useRouter();
  const [workout, setWorkout] = useState(initialWorkout);
  const [sets, setSets] = useState(initialSets);
  const [isPending, startTransition] = useTransition();
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const [summary, setSummary] = useState<{
    totalVolume: number;
    setsCompleted: number;
    totalSets: number;
    avgRpe: number | null;
    prs: string[];
  } | null>(null);

  const sessionType = workout?.session_type ?? nextSessionType;
  const isStarted = workout != null;
  const isCompleted = workout?.completed ?? false;

  // Group sets by exercise
  const exerciseGroups = sets.reduce(
    (acc, set) => {
      if (!set.exercise) return acc;
      const key = set.exercise_id;
      if (!acc[key]) {
        acc[key] = { exercise: set.exercise, sets: [] };
      }
      acc[key].sets.push(set);
      return acc;
    },
    {} as Record<string, { exercise: Exercise; sets: (WorkoutSet & { exercise?: Exercise })[] }>
  );

  // Maintain exercise order from sets array
  const exerciseOrder = sets.reduce((acc, set) => {
    if (!acc.includes(set.exercise_id)) acc.push(set.exercise_id);
    return acc;
  }, [] as string[]);

  function handleStartWorkout() {
    startTransition(async () => {
      const result = await createWorkout(nextSessionType);
      if (result.workoutId) {
        router.refresh();
      }
    });
  }

  function handleSetCompleted(isCompound: boolean) {
    setRestDuration(isCompound ? 90 : 60);
    setShowRestTimer(true);
  }

  function handleCompleteWorkout() {
    if (!workout) return;

    startTransition(async () => {
      const result = await completeWorkout(workout.id);
      if (result.summary) {
        setSummary(result.summary);
      }
      router.refresh();
    });
  }

  // Pre-workout view
  if (!isStarted) {
    return (
      <div className="flex-1 flex flex-col p-4 pb-24">
        <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-sm mx-auto w-full">
          <div className="text-center space-y-2">
            <p className="text-text-secondary text-sm uppercase tracking-wider">
              Today&apos;s Workout
            </p>
            <h1 className="text-3xl font-bold text-text-primary">
              Session {nextSessionType}
            </h1>
            <p className="text-text-tertiary text-sm">
              {nextSessionType === "A"
                ? "Squat · Bench · Row · OHP · Plank"
                : "Deadlift · Incline Bench · Pull-ups · DB Rows · Leg Raises"}
            </p>
          </div>

          {/* Session preview */}
          <div className="glass-card p-5 w-full space-y-3">
            <h2 className="text-text-secondary text-xs uppercase tracking-wider font-medium">
              Exercises
            </h2>
            {(() => {
              const template = SESSION_TEMPLATES.find(
                (t) => t.type === nextSessionType
              );
              if (!template) return null;
              return template.exercises.map(
                (ex, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-glass-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          ex.isHeavy ? "bg-amber" : "bg-text-tertiary"
                        }`}
                      />
                      <span className="text-text-primary text-sm">
                        {ex.exerciseName}
                      </span>
                    </div>
                    <span className="text-text-tertiary text-xs font-mono">
                      {ex.sets}x{ex.targetReps}
                    </span>
                  </div>
                )
              );
            })()}
          </div>

          <button
            onClick={handleStartWorkout}
            disabled={isPending}
            className="btn-primary w-full !py-4 !text-lg font-semibold !rounded-xl active:scale-[0.98] transition-transform"
          >
            {isPending ? "Setting up..." : "Start Workout"}
          </button>
        </div>
      </div>
    );
  }

  // Active / completed workout view
  return (
    <div className="flex-1 flex flex-col p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-text-secondary text-xs uppercase tracking-wider">
            {isCompleted ? "Completed" : "In Progress"}
          </p>
          <h1 className="text-2xl font-bold text-text-primary">
            Session {sessionType}
          </h1>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal shadow-[0_0_8px_var(--teal)]" />
            <span className="text-teal text-sm font-medium">Done</span>
          </div>
        )}
      </div>

      {/* RPE Guide */}
      <RPEGuide />

      {/* Exercise cards */}
      <div className="space-y-3 flex-1">
        {exerciseOrder.map((exerciseId) => {
          const group = exerciseGroups[exerciseId];
          if (!group) return null;

          const info = templateInfo[group.exercise.name] ?? {
            targetReps: "8",
            isHeavy: false,
          };

          // Recommended weight = weight pre-filled from last session (already on the set)
          const recommendedWeight = group.sets[0]?.weight ?? null;

          return (
            <ExerciseCard
              key={exerciseId}
              exercise={group.exercise}
              sets={group.sets}
              targetReps={info.targetReps}
              isHeavy={info.isHeavy}
              recommendedWeight={recommendedWeight}
              onSetCompleted={handleSetCompleted}
            />
          );
        })}
      </div>

      {/* Complete workout button */}
      {!isCompleted && (
        <div className="mt-6">
          <button
            onClick={handleCompleteWorkout}
            disabled={isPending}
            className="btn-primary w-full !py-4 !text-lg font-semibold !rounded-xl active:scale-[0.98] transition-transform"
          >
            {isPending ? "Saving..." : "Complete Workout"}
          </button>
        </div>
      )}

      {/* Rest timer overlay */}
      {showRestTimer && (
        <RestTimer
          duration={restDuration}
          onDismiss={() => setShowRestTimer(false)}
        />
      )}

      {/* Workout summary overlay */}
      {summary && (
        <WorkoutSummary
          summary={summary}
          onDismiss={() => router.push("/dashboard")}
        />
      )}
    </div>
  );
}
