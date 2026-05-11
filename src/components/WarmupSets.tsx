"use client";

import { useState } from "react";

interface WarmupSetsProps {
  workingWeight: number;
  exerciseName: string;
}

interface WarmupSet {
  weight: number;
  reps: number;
  plateBreakdown: string;
}

const BAR_WEIGHT = 45;

/** Available plate sizes, largest first */
const PLATES = [45, 35, 25, 10, 5, 2.5];

function roundToNearest5(n: number): number {
  return Math.round(n / 5) * 5;
}

/**
 * Returns a human-readable string of plates needed on each side.
 * e.g. "45 + 10" for 155 lbs total (each side = 55)
 */
function getPlateBreakdown(weight: number): string {
  if (weight <= BAR_WEIGHT) return "";

  let remaining = (weight - BAR_WEIGHT) / 2;
  const plates: number[] = [];

  for (const plate of PLATES) {
    while (remaining >= plate) {
      plates.push(plate);
      remaining -= plate;
    }
  }

  if (plates.length === 0) return "";
  return plates.map((p) => (p % 1 === 0 ? p.toString() : p.toFixed(1))).join(" + ");
}

function generateWarmupSets(workingWeight: number): WarmupSet[] {
  if (workingWeight <= BAR_WEIGHT) return [];

  if (workingWeight <= 65) {
    return [{ weight: BAR_WEIGHT, reps: 10, plateBreakdown: "" }];
  }

  const sets: WarmupSet[] = [];

  // Set 1: Empty bar × 10
  sets.push({ weight: BAR_WEIGHT, reps: 10, plateBreakdown: "" });

  // Set 2: ~50% × 5
  const fiftyPct = roundToNearest5(workingWeight * 0.5);
  if (fiftyPct > BAR_WEIGHT) {
    sets.push({
      weight: fiftyPct,
      reps: 5,
      plateBreakdown: getPlateBreakdown(fiftyPct),
    });
  }

  // Set 3: ~75% × 3
  const seventyFivePct = roundToNearest5(workingWeight * 0.75);
  if (seventyFivePct > fiftyPct && seventyFivePct < workingWeight) {
    sets.push({
      weight: seventyFivePct,
      reps: 3,
      plateBreakdown: getPlateBreakdown(seventyFivePct),
    });
  }

  return sets;
}

export function WarmupSets({ workingWeight, exerciseName }: WarmupSetsProps) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const sets = generateWarmupSets(workingWeight);

  const toggleCheck = (index: number) => {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // No warmup needed
  if (workingWeight <= BAR_WEIGHT) {
    return null;
  }

  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.15)",
        paddingBottom: "0.75rem",
        marginBottom: "0.75rem",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium transition-colors w-full"
        style={{ color: "var(--text-tertiary)" }}
      >
        {/* Dumbbell icon */}
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6.5 6.5h11" />
          <path d="M6.5 17.5h11" />
          <path d="M6 6.5V17.5" />
          <path d="M18 6.5V17.5" />
          <path d="M3 8v8" />
          <path d="M21 8v8" />
          <path d="M12 6.5v11" />
        </svg>
        Warm-up
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="4 6 8 10 12 6" />
        </svg>
        {!open && (
          <span
            className="ml-auto text-[10px]"
            style={{ color: "var(--text-tertiary)", opacity: 0.6 }}
          >
            {sets.length} set{sets.length !== 1 ? "s" : ""}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 space-y-1">
          {sets.map((set, i) => {
            const isChecked = checked[i] ?? false;
            return (
              <label
                key={i}
                className="flex items-center gap-2.5 py-1 px-1 rounded cursor-pointer transition-opacity"
                style={{
                  color: "var(--text-tertiary)",
                  opacity: isChecked ? 0.4 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleCheck(i)}
                  className="sr-only"
                />
                <span
                  className="flex items-center justify-center shrink-0 rounded transition-colors"
                  style={{
                    width: 16,
                    height: 16,
                    border: `1.5px solid ${isChecked ? "var(--teal)" : "rgba(255,255,255,0.15)"}`,
                    backgroundColor: isChecked ? "var(--teal)" : "transparent",
                  }}
                >
                  {isChecked && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="#0F1117"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 8 7 12 13 4" />
                    </svg>
                  )}
                </span>
                <span
                  className="text-xs tabular-nums"
                  style={{
                    textDecoration: isChecked ? "line-through" : "none",
                  }}
                >
                  <span style={{ color: isChecked ? "var(--text-tertiary)" : "var(--text-secondary)" }}>
                    {set.weight} lbs
                  </span>
                  <span style={{ margin: "0 4px", opacity: 0.4 }}>×</span>
                  {set.reps}
                  {set.plateBreakdown && (
                    <span style={{ opacity: 0.5, marginLeft: 8 }}>
                      — each side: {set.plateBreakdown}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
