"use client";

import { useState, useTransition } from "react";
import { updateSet } from "../actions";

interface SetRowProps {
  set: {
    id: string;
    set_number: number;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    completed: boolean;
  };
  recommendedWeight: number | null;
  targetReps: string;
  onSetCompletionChange: (isCompleted: boolean) => void;
}

export default function SetRow({
  set,
  recommendedWeight,
  targetReps,
  onSetCompletionChange,
}: SetRowProps) {
  const [weight, setWeight] = useState<string>(
    set.weight != null ? String(set.weight) : ""
  );
  const [reps, setReps] = useState<string>(
    set.reps != null ? String(set.reps) : ""
  );
  const [rpe, setRpe] = useState<string>(
    set.rpe != null ? String(set.rpe) : ""
  );
  const [completed, setCompleted] = useState(set.completed);
  const [isPending, startTransition] = useTransition();

  function handleComplete() {
    const newCompleted = !completed;
    setCompleted(newCompleted);

    // Auto-fill reps from placeholder if empty when completing
    const effectiveWeight = weight || (recommendedWeight ? String(recommendedWeight) : "");
    const effectiveReps = reps || targetReps.replace(/[^0-9]/g, "") || null;

    if (newCompleted && !weight && recommendedWeight) {
      setWeight(String(recommendedWeight));
    }
    if (newCompleted && !reps && targetReps) {
      const numericReps = targetReps.replace(/[^0-9]/g, "");
      if (numericReps) setReps(numericReps);
    }

    // Notify parent immediately for real-time counter updates
    onSetCompletionChange(newCompleted);

    startTransition(async () => {
      await updateSet(set.id, {
        weight: effectiveWeight ? Number(effectiveWeight) : null,
        reps: effectiveReps ? Number(effectiveReps) : null,
        rpe: rpe ? Number(rpe) : null,
        completed: newCompleted,
      });
    });
  }

  function handleFieldBlur() {
    startTransition(async () => {
      await updateSet(set.id, {
        weight: weight ? Number(weight) : null,
        reps: reps ? Number(reps) : null,
        rpe: rpe ? Number(rpe) : null,
        completed,
      });
    });
  }

  const rpeOptions = [
    { value: "6", label: "6" },
    { value: "7", label: "7" },
    { value: "7.5", label: "7.5" },
    { value: "8", label: "8" },
    { value: "8.5", label: "8.5" },
    { value: "9", label: "9" },
    { value: "9.5", label: "9.5" },
    { value: "10", label: "10" },
  ];

  return (
    <div
      className={`flex items-center gap-2 px-3 py-3 rounded-lg transition-all duration-150 ${
        completed
          ? "bg-teal/10 border border-teal/30"
          : "bg-white/[0.03] border border-transparent"
      }`}
    >
      {/* Set number */}
      <span className="text-text-secondary text-sm font-mono w-6 shrink-0 text-center">
        {set.set_number}
      </span>

      {/* Weight input */}
      <div className="flex-1 min-w-0">
        <input
          type="number"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={handleFieldBlur}
          placeholder={recommendedWeight ? String(recommendedWeight) : "lbs"}
          className="glass-input !py-3 !px-3 text-center font-mono text-base !rounded-md"
          style={{ fontSize: "16px" }}
          disabled={isPending}
        />
        <span className="text-[10px] text-text-tertiary text-center block mt-0.5">
          lbs
        </span>
      </div>

      {/* Reps input */}
      <div className="flex-1 min-w-0">
        <input
          type="number"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onBlur={handleFieldBlur}
          placeholder={targetReps}
          className="glass-input !py-3 !px-3 text-center font-mono text-base !rounded-md"
          style={{ fontSize: "16px" }}
          disabled={isPending}
        />
        <span className="text-[10px] text-text-tertiary text-center block mt-0.5">
          reps
        </span>
      </div>

      {/* RPE select */}
      <div className="w-16 shrink-0">
        <select
          value={rpe}
          onChange={(e) => {
            setRpe(e.target.value);
            startTransition(async () => {
              await updateSet(set.id, {
                weight: weight ? Number(weight) : null,
                reps: reps ? Number(reps) : null,
                rpe: e.target.value ? Number(e.target.value) : null,
                completed,
              });
            });
          }}
          className="glass-input !py-3 !px-1 text-center font-mono text-base !rounded-md appearance-none"
          style={{ fontSize: "16px" }}
          disabled={isPending}
        >
          <option value="" className="bg-[#0B0F1A]">
            RPE
          </option>
          {rpeOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0B0F1A]">
              {opt.label}
            </option>
          ))}
        </select>
        <span className="text-[10px] text-text-tertiary text-center block mt-0.5">
          RPE
        </span>
      </div>

      {/* Complete checkbox */}
      <button
        onClick={handleComplete}
        disabled={isPending}
        className={`w-11 h-11 shrink-0 rounded-lg border-2 flex items-center justify-center transition-all duration-150 active:scale-95 ${
          completed
            ? "bg-teal/20 border-teal text-teal"
            : "border-glass-border text-transparent hover:border-text-tertiary"
        }`}
        aria-label={`Mark set ${set.set_number} as ${completed ? "incomplete" : "complete"}`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4 10 8 14 16 6" />
        </svg>
      </button>
    </div>
  );
}
