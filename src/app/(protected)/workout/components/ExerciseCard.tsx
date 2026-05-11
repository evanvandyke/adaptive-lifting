"use client";

import { useState, useCallback } from "react";
import type { WorkoutSet, Exercise } from "@/lib/types";
import SetRow from "./SetRow";
import { WarmupSets } from "@/components/WarmupSets";
import { PlateCalculator } from "@/components/PlateCalculator";

interface ExerciseCardProps {
  exercise: Exercise;
  sets: (WorkoutSet & { exercise?: Exercise })[];
  targetReps: string;
  isHeavy: boolean;
  recommendedWeight: number | null;
  onSetCompleted: (isCompound: boolean) => void;
}

export default function ExerciseCard({
  exercise,
  sets,
  targetReps,
  isHeavy,
  recommendedWeight,
  onSetCompleted,
}: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [showPlates, setShowPlates] = useState(false);

  // Track completed set IDs locally so the counter updates in real-time
  const [completedSetIds, setCompletedSetIds] = useState<Set<string>>(
    () => new Set(sets.filter((s) => s.completed).map((s) => s.id))
  );

  const handleSetCompletionChange = useCallback(
    (setId: string, isCompleted: boolean) => {
      setCompletedSetIds((prev) => {
        const next = new Set(prev);
        if (isCompleted) {
          next.add(setId);
        } else {
          next.delete(setId);
        }
        return next;
      });
      if (isCompleted) {
        onSetCompleted(exercise.category === "compound");
      }
    },
    [onSetCompleted, exercise.category]
  );

  const completedCount = completedSetIds.size;
  const allCompleted = completedCount === sets.length && sets.length > 0;

  return (
    <div className="glass-card overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left active:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Completion indicator */}
          <div
            className={`w-3 h-3 rounded-full shrink-0 transition-colors duration-300 ${
              allCompleted
                ? "bg-teal shadow-[0_0_8px_var(--teal)]"
                : completedCount > 0
                  ? "bg-amber"
                  : "bg-text-tertiary"
            }`}
          />

          <div className="min-w-0">
            <h3 className="text-text-primary font-semibold text-base truncate">
              {exercise.name}
            </h3>
            <p className="text-text-tertiary text-xs mt-0.5">
              {sets.length} x {targetReps}
              {recommendedWeight ? ` · ${recommendedWeight} lbs` : ""}
              {isHeavy ? " · Heavy" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Set progress */}
          <span className="text-text-secondary text-sm font-mono">
            {completedCount}/{sets.length}
          </span>

          {/* Chevron */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          >
            <polyline points="4 6 8 10 12 6" />
          </svg>
        </div>
      </button>

      {/* Set rows — expandable */}
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5">
          {/* Warm-up sets */}
          {isHeavy && recommendedWeight && recommendedWeight > 45 && (
            <WarmupSets
              workingWeight={recommendedWeight}
              exerciseName={exercise.name}
            />
          )}

          {/* Plate calculator toggle */}
          {recommendedWeight && recommendedWeight > 45 && (
            <div className="px-3 pb-2">
              <button
                onClick={() => setShowPlates(!showPlates)}
                className="text-[10px] flex items-center gap-1 transition-colors"
                style={{ color: showPlates ? "var(--teal)" : "var(--text-tertiary)" }}
              >
                🏋️ {showPlates ? "Hide" : "Show"} plate breakdown
              </button>
              {showPlates && (
                <div className="mt-2">
                  <PlateCalculator weight={recommendedWeight} />
                </div>
              )}
            </div>
          )}

          {/* Column headers */}
          <div className="flex items-center gap-2 px-3 pb-1">
            <span className="w-6 text-center text-[10px] text-text-tertiary uppercase">
              Set
            </span>
            <span className="flex-1 text-center text-[10px] text-text-tertiary uppercase">
              Weight
            </span>
            <span className="flex-1 text-center text-[10px] text-text-tertiary uppercase">
              Reps
            </span>
            <span className="w-16 text-center text-[10px] text-text-tertiary uppercase">
              RPE
            </span>
            <span className="w-11 text-center text-[10px] text-text-tertiary uppercase">
              ✓
            </span>
          </div>

          {sets.map((set) => (
            <SetRow
              key={set.id}
              set={set}
              recommendedWeight={recommendedWeight}
              targetReps={targetReps}
              onSetCompletionChange={(isCompleted) =>
                handleSetCompletionChange(set.id, isCompleted)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
