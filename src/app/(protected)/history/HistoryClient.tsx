"use client";

import { useState } from "react";
import type { Workout, WorkoutSet, Exercise } from "@/lib/types";

interface WorkoutWithSets extends Workout {
  sets: (WorkoutSet & { exercise?: Exercise })[];
}

interface HistoryClientProps {
  workouts: WorkoutWithSets[];
}

export default function HistoryClient({ workouts }: HistoryClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (workouts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 pb-24">
        <div className="text-center space-y-3">
          <div className="text-4xl">📋</div>
          <h2 className="text-xl font-bold text-text-primary">
            No Workouts Yet
          </h2>
          <p className="text-text-secondary text-sm max-w-xs">
            Complete your first workout and it&apos;ll show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 pb-24">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-text-primary">History</h1>
        <p className="text-text-secondary text-sm mt-1">
          {workouts.length} workout{workouts.length !== 1 ? "s" : ""} logged
        </p>
      </div>

      <div className="space-y-2">
        {workouts.map((workout) => {
          const isExpanded = expandedId === workout.id;
          const completedSets = workout.sets.filter((s) => s.completed);
          const totalVolume = completedSets.reduce(
            (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
            0
          );

          // Group sets by exercise for expanded view
          const exerciseGroups = workout.sets.reduce(
            (acc, set) => {
              if (!set.exercise) return acc;
              const name = set.exercise.name;
              if (!acc[name]) acc[name] = [];
              acc[name].push(set);
              return acc;
            },
            {} as Record<string, (WorkoutSet & { exercise?: Exercise })[]>
          );

          const dateStr = new Date(workout.date + "T12:00:00").toLocaleDateString(
            "en-US",
            {
              weekday: "short",
              month: "short",
              day: "numeric",
            }
          );

          return (
            <div key={workout.id} className="glass-card overflow-hidden">
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : workout.id)
                }
                className="w-full flex items-center justify-between p-4 text-left active:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      workout.completed
                        ? "bg-teal shadow-[0_0_8px_var(--teal)]"
                        : "bg-text-tertiary"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-text-primary font-semibold text-sm">
                        Session {workout.session_type ?? "—"}
                      </h3>
                      <span className="text-text-tertiary text-xs">
                        {dateStr}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-text-secondary text-xs font-mono">
                        {totalVolume.toLocaleString()} lbs
                      </span>
                      <span className="text-text-tertiary text-xs">
                        {completedSets.length}/{workout.sets.length} sets
                      </span>
                    </div>
                  </div>
                </div>

                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="var(--text-tertiary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 shrink-0 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                >
                  <polyline points="4 6 8 10 12 6" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-glass-border pt-3">
                  {Object.entries(exerciseGroups).map(([name, sets]) => (
                    <div key={name}>
                      <h4 className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-1.5">
                        {name}
                      </h4>
                      <div className="space-y-1">
                        {sets.map((set) => (
                          <div
                            key={set.id}
                            className={`flex items-center gap-3 text-xs font-mono px-2 py-1.5 rounded ${
                              set.completed
                                ? "text-text-primary"
                                : "text-text-tertiary"
                            }`}
                          >
                            <span className="text-text-tertiary w-4">
                              {set.set_number}
                            </span>
                            <span className="w-16">
                              {set.weight ?? "—"} lbs
                            </span>
                            <span className="w-12">
                              {set.reps ?? "—"} reps
                            </span>
                            <span className="w-10">
                              RPE {set.rpe ?? "—"}
                            </span>
                            {set.completed && (
                              <span className="text-teal">✓</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {workout.notes && (
                    <div className="mt-2 pt-2 border-t border-glass-border">
                      <p className="text-text-tertiary text-xs">
                        {workout.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
