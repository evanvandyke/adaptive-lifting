"use client";

import { useState, useMemo } from "react";

const BAR_WEIGHT = 45;
const AVAILABLE_PLATES = [45, 35, 25, 10, 5, 2.5];

// Each plate gets a distinct color from the design system palette
const PLATE_COLORS: Record<number, { bg: string; border: string; label: string }> = {
  45:   { bg: "rgba(139, 41, 66, 0.7)",   border: "rgba(139, 41, 66, 0.9)",   label: "#F0EDE8" },  // velvet
  35:   { bg: "rgba(139, 92, 246, 0.5)",   border: "rgba(139, 92, 246, 0.7)",  label: "#F0EDE8" },  // aurora-violet
  25:   { bg: "rgba(45, 212, 191, 0.4)",   border: "rgba(45, 212, 191, 0.7)",  label: "#F0EDE8" },  // teal
  10:   { bg: "rgba(244, 162, 97, 0.45)",  border: "rgba(244, 162, 97, 0.7)",  label: "#F0EDE8" },  // amber
  5:    { bg: "rgba(107, 154, 91, 0.5)",   border: "rgba(107, 154, 91, 0.7)",  label: "#F0EDE8" },  // aurora-lime
  2.5:  { bg: "rgba(122, 139, 163, 0.35)", border: "rgba(122, 139, 163, 0.6)", label: "#F0EDE8" },  // text-secondary
};

// Plate visual heights — heavier plates are taller
const PLATE_HEIGHT: Record<number, number> = {
  45: 36,
  35: 32,
  25: 28,
  10: 22,
  5: 18,
  2.5: 14,
};

// Plate widths — heavier plates are thicker
const PLATE_WIDTH: Record<number, number> = {
  45: 12,
  35: 11,
  25: 10,
  10: 8,
  5: 7,
  2.5: 6,
};

function calculatePlates(targetWeight: number): {
  plates: number[];
  achievableWeight: number;
  isExact: boolean;
} {
  if (targetWeight <= BAR_WEIGHT) {
    return { plates: [], achievableWeight: BAR_WEIGHT, isExact: targetWeight === BAR_WEIGHT };
  }

  const perSide = (targetWeight - BAR_WEIGHT) / 2;
  const plates: number[] = [];
  let remaining = perSide;

  for (const plate of AVAILABLE_PLATES) {
    while (remaining >= plate - 0.001) {
      plates.push(plate);
      remaining -= plate;
    }
  }

  const actualPerSide = plates.reduce((sum, p) => sum + p, 0);
  const achievableWeight = BAR_WEIGHT + actualPerSide * 2;
  const isExact = Math.abs(remaining) < 0.01;

  return { plates, achievableWeight, isExact };
}

function findNearestAchievable(targetWeight: number): number {
  if (targetWeight <= BAR_WEIGHT) return BAR_WEIGHT;

  // Smallest increment is 2.5 per side = 5 lbs total
  const perSide = (targetWeight - BAR_WEIGHT) / 2;
  const plates: number[] = [];
  let remaining = perSide;

  for (const plate of AVAILABLE_PLATES) {
    while (remaining >= plate - 0.001) {
      plates.push(plate);
      remaining -= plate;
    }
  }

  const lowerWeight = BAR_WEIGHT + plates.reduce((sum, p) => sum + p, 0) * 2;

  // Try adding the smallest plate to get the next achievable weight up
  const upperWeight = lowerWeight + 5; // 2.5 per side

  if (Math.abs(targetWeight - lowerWeight) <= Math.abs(targetWeight - upperWeight)) {
    return lowerWeight;
  }
  return upperWeight;
}

// -- Plate Diagram (one side) --
function PlateSide({ plates, flip }: { plates: number[]; flip?: boolean }) {
  const ordered = flip ? [...plates].reverse() : plates;

  return (
    <div
      className="flex items-center"
      style={{ flexDirection: flip ? "row-reverse" : "row", gap: "1px" }}
    >
      {ordered.map((plate, i) => {
        const colors = PLATE_COLORS[plate];
        const h = PLATE_HEIGHT[plate];
        const w = PLATE_WIDTH[plate];
        return (
          <div
            key={`${plate}-${i}`}
            className="relative flex items-center justify-center shrink-0"
            style={{
              width: w,
              height: h,
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 2,
            }}
            title={`${plate} lbs`}
          >
            {/* Show weight label on plates wide enough */}
            {plate >= 10 && (
              <span
                className="absolute text-center font-mono leading-none select-none"
                style={{
                  fontSize: 6,
                  color: colors.label,
                  opacity: 0.9,
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                }}
              >
                {plate}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// -- Barbell Diagram --
function BarbellDiagram({ plates }: { plates: number[] }) {
  return (
    <div className="flex items-center justify-center w-full py-1">
      {/* Left collar */}
      <div
        className="shrink-0"
        style={{
          width: 4,
          height: 10,
          backgroundColor: "var(--text-tertiary)",
          borderRadius: "2px 0 0 2px",
          opacity: 0.6,
        }}
      />
      {/* Left bar segment */}
      <div
        className="shrink-0"
        style={{
          width: 16,
          height: 4,
          backgroundColor: "var(--text-tertiary)",
          opacity: 0.5,
        }}
      />
      {/* Left plates */}
      <PlateSide plates={plates} flip />
      {/* Left collar clamp */}
      <div
        className="shrink-0"
        style={{
          width: 3,
          height: 14,
          backgroundColor: "var(--text-tertiary)",
          opacity: 0.4,
          borderRadius: 1,
        }}
      />
      {/* Center bar */}
      <div
        className="flex-1 min-w-6 max-w-16"
        style={{
          height: 4,
          backgroundColor: "var(--text-tertiary)",
          opacity: 0.5,
        }}
      />
      {/* Right collar clamp */}
      <div
        className="shrink-0"
        style={{
          width: 3,
          height: 14,
          backgroundColor: "var(--text-tertiary)",
          opacity: 0.4,
          borderRadius: 1,
        }}
      />
      {/* Right plates */}
      <PlateSide plates={plates} />
      {/* Right bar segment */}
      <div
        className="shrink-0"
        style={{
          width: 16,
          height: 4,
          backgroundColor: "var(--text-tertiary)",
          opacity: 0.5,
        }}
      />
      {/* Right collar */}
      <div
        className="shrink-0"
        style={{
          width: 4,
          height: 10,
          backgroundColor: "var(--text-tertiary)",
          borderRadius: "0 2px 2px 0",
          opacity: 0.6,
        }}
      />
    </div>
  );
}

// -- Main Component --
export function PlateCalculator({ weight }: { weight: number }) {
  const result = useMemo(() => {
    if (!weight || weight <= 0) return null;
    const { plates, achievableWeight, isExact } = calculatePlates(weight);
    const nearest = isExact ? null : findNearestAchievable(weight);
    const nearestPlates = nearest ? calculatePlates(nearest).plates : null;
    return { plates, achievableWeight, isExact, nearest, nearestPlates };
  }, [weight]);

  if (!result) return null;

  // Weight is less than or equal to bar
  if (weight < BAR_WEIGHT) {
    return (
      <div
        className="text-xs font-mono text-center py-1.5"
        style={{ color: "var(--text-tertiary)" }}
      >
        Use dumbbells for {weight} lbs
      </div>
    );
  }

  if (weight === BAR_WEIGHT) {
    return (
      <div className="flex flex-col items-center gap-1 py-1.5">
        <BarbellDiagram plates={[]} />
        <span
          className="text-xs font-mono"
          style={{ color: "var(--text-tertiary)" }}
        >
          Just the bar — 45 lbs
        </span>
      </div>
    );
  }

  const { plates, isExact, nearest, nearestPlates } = result;
  const displayPlates = isExact ? plates : (nearestPlates ?? plates);
  const displayWeight = isExact ? weight : nearest!;

  const perSide = displayPlates.reduce((sum, p) => sum + p, 0);
  const plateBreakdown = displayPlates
    .reduce<{ plate: number; count: number }[]>((acc, p) => {
      const last = acc[acc.length - 1];
      if (last && last.plate === p) {
        last.count++;
      } else {
        acc.push({ plate: p, count: 1 });
      }
      return acc;
    }, [])
    .map(({ plate, count }) => (count > 1 ? `${plate}x${count}` : `${plate}`))
    .join(" + ");

  return (
    <div className="flex flex-col items-center gap-1 py-1.5">
      {!isExact && (
        <span
          className="text-[10px] font-mono"
          style={{ color: "var(--amber)" }}
        >
          {weight} lbs not loadable — showing {displayWeight} lbs
        </span>
      )}
      <BarbellDiagram plates={displayPlates} />
      <span
        className="text-[10px] font-mono"
        style={{ color: "var(--text-tertiary)" }}
      >
        Each side: {plateBreakdown} = {perSide} lbs
      </span>
    </div>
  );
}

// -- Toggle Button for SetRow integration --
export function PlateCalculatorToggle({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-center transition-colors active:scale-95"
      style={{
        color: isOpen ? "var(--teal)" : "var(--text-tertiary)",
        width: 24,
        height: 24,
      }}
      aria-label="Toggle plate calculator"
      title="Plate breakdown"
    >
      {/* Barbell icon */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Bar */}
        <line x1="2" y1="12" x2="22" y2="12" />
        {/* Left plate */}
        <rect x="4" y="7" width="3" height="10" rx="0.5" />
        {/* Right plate */}
        <rect x="17" y="7" width="3" height="10" rx="0.5" />
        {/* Left collar */}
        <line x1="7" y1="9" x2="7" y2="15" />
        {/* Right collar */}
        <line x1="17" y1="9" x2="17" y2="15" />
      </svg>
    </button>
  );
}
