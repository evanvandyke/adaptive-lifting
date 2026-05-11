"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { logProtein } from "../../nutrition/actions";

interface NutritionEntry {
  id: string;
  protein_grams: number;
  meal_type: string;
  meal_description: string | null;
}

interface NutritionCardProps {
  todayEntries: NutritionEntry[];
  proteinTarget: number;
}

const quickButtons = [
  { label: "Chicken breast", grams: 20, emoji: "🍗" },
  { label: "Protein shake", grams: 30, emoji: "🥤" },
  { label: "Eggs", grams: 15, emoji: "🥚" },
  { label: "Greek yogurt", grams: 10, emoji: "🥛" },
];

export function NutritionCard({
  todayEntries,
  proteinTarget,
}: NutritionCardProps) {
  const [isPending, startTransition] = useTransition();
  const [activeBtn, setActiveBtn] = useState<number | null>(null);

  const totalProtein = todayEntries.reduce(
    (sum, e) => sum + (e.protein_grams ?? 0),
    0
  );
  const progress = Math.min(totalProtein / Math.max(proteinTarget, 1), 1);
  const hitTarget = totalProtein >= proteinTarget;
  const behindPace = totalProtein < proteinTarget * (new Date().getHours() / 24) * 0.8;

  const barColor = hitTarget
    ? "var(--success)"
    : behindPace
      ? "var(--amber)"
      : "var(--teal)";

  function handleQuickAdd(grams: number, label: string, index: number) {
    setActiveBtn(index);
    startTransition(async () => {
      await logProtein(grams, undefined, label);
      setActiveBtn(null);
    });
  }

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2
            className="text-sm font-medium uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            Protein
          </h2>
        </div>
        <Link
          href="/nutrition"
          className="text-xs font-medium"
          style={{ color: "var(--teal)" }}
        >
          Details →
        </Link>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-baseline justify-between mb-1.5">
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: barColor }}
          >
            {totalProtein}g
          </span>
          <span
            className="text-sm font-mono"
            style={{ color: "var(--text-tertiary)" }}
          >
            / {proteinTarget}g
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: "rgba(255, 255, 255, 0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress * 100}%`,
              background: barColor,
              boxShadow: hitTarget ? `0 0 12px ${barColor}` : "none",
            }}
          />
        </div>
      </div>

      {/* Quick-add buttons */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {quickButtons.map((btn, i) => (
          <button
            key={btn.label}
            onClick={() => handleQuickAdd(btn.grams, btn.label, i)}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all duration-150 active:scale-95"
            style={{
              background:
                activeBtn === i
                  ? "rgba(45, 212, 191, 0.15)"
                  : "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <span className="text-base">{btn.emoji}</span>
            <div className="flex-1 min-w-0">
              <span
                className="text-xs block truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {btn.label}
              </span>
              <span
                className="text-[10px] font-mono"
                style={{ color: "var(--text-tertiary)" }}
              >
                +{btn.grams}g
              </span>
            </div>
          </button>
        ))}
      </div>

      <p
        className="text-[11px] mt-3 text-center italic"
        style={{ color: "var(--text-tertiary)" }}
      >
        Hit your protein. Fill the rest with whatever keeps you sane.
      </p>
    </section>
  );
}
