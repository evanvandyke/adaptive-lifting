"use client";

import { useState, useTransition } from "react";
import { logProtein, deleteProteinEntry } from "./actions";

interface NutritionEntry {
  id: string;
  protein_grams: number;
  meal_type: string;
  meal_description: string | null;
  created_at: string;
}

interface WeekDay {
  date: string;
  label: string;
  total: number;
}

interface NutritionPageClientProps {
  todayEntries: NutritionEntry[];
  proteinTarget: number;
  weeklyData: WeekDay[];
  weeklyAvg: number;
}

const quickButtons = [
  { label: "Chicken breast", grams: 20, emoji: "🍗" },
  { label: "Protein shake", grams: 30, emoji: "🥤" },
  { label: "Eggs", grams: 15, emoji: "🥚" },
  { label: "Greek yogurt", grams: 10, emoji: "🥛" },
];

export function NutritionPageClient({
  todayEntries,
  proteinTarget,
  weeklyData,
  weeklyAvg,
}: NutritionPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [customGrams, setCustomGrams] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  const totalProtein = todayEntries.reduce(
    (sum, e) => sum + (e.protein_grams ?? 0),
    0
  );
  const progress = Math.min(totalProtein / Math.max(proteinTarget, 1), 1);
  const hitTarget = totalProtein >= proteinTarget;
  const behindPace =
    totalProtein < proteinTarget * (new Date().getHours() / 24) * 0.8;

  const barColor = hitTarget
    ? "var(--success)"
    : behindPace
      ? "var(--amber)"
      : "var(--teal)";

  const maxWeekly = Math.max(...weeklyData.map((d) => d.total), proteinTarget);

  function handleQuickAdd(grams: number, label: string) {
    startTransition(async () => {
      await logProtein(grams, undefined, label);
    });
  }

  function handleCustomAdd() {
    const grams = parseInt(customGrams);
    if (isNaN(grams) || grams <= 0) return;
    const desc = customDesc.trim() || undefined;
    startTransition(async () => {
      await logProtein(grams, undefined, desc);
      setCustomGrams("");
      setCustomDesc("");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteProteinEntry(id);
    });
  }

  return (
    <div className="flex-1 px-4 py-6 pb-24 max-w-lg mx-auto w-full space-y-5">
      {/* Header */}
      <section>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Nutrition
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
          Track protein. Don&apos;t overthink it.
        </p>
      </section>

      {/* Big protein number */}
      <section className="glass-card p-6 text-center">
        <p
          className="text-5xl font-bold tabular-nums"
          style={{ color: barColor }}
        >
          {totalProtein}g
        </p>
        <p
          className="text-sm font-mono mt-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          of {proteinTarget}g protein today
        </p>
        <div
          className="h-3 rounded-full overflow-hidden mt-4"
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
        {hitTarget && (
          <p
            className="text-sm font-medium mt-3"
            style={{ color: "var(--success)" }}
          >
            🎯 Target hit. Nice work.
          </p>
        )}
      </section>

      {/* Quick-add buttons */}
      <section className="glass-card p-5">
        <h2
          className="text-sm font-medium uppercase tracking-wide mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Quick Add
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {quickButtons.map((btn) => (
            <button
              key={btn.label}
              onClick={() => handleQuickAdd(btn.grams, btn.label)}
              disabled={isPending}
              className="flex items-center gap-2 px-3 py-3 rounded-lg text-left transition-all duration-150 active:scale-95"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <span className="text-lg">{btn.emoji}</span>
              <div className="flex-1 min-w-0">
                <span
                  className="text-sm block truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {btn.label}
                </span>
                <span
                  className="text-xs font-mono"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  +{btn.grams}g protein
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Custom input */}
      <section className="glass-card p-5">
        <h2
          className="text-sm font-medium uppercase tracking-wide mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Custom Entry
        </h2>
        <div className="flex gap-2 mb-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Protein (g)"
            value={customGrams}
            onChange={(e) => setCustomGrams(e.target.value)}
            className="glass-input flex-1"
            style={{ maxWidth: "120px" }}
          />
          <input
            type="text"
            placeholder="What'd you eat? (optional)"
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            className="glass-input flex-1"
          />
        </div>
        <button
          onClick={handleCustomAdd}
          disabled={isPending || !customGrams}
          className="btn-primary w-full mt-2"
        >
          {isPending ? "Adding..." : "Add Protein"}
        </button>
      </section>

      {/* Today's entries */}
      {todayEntries.length > 0 && (
        <section className="glass-card p-5">
          <h2
            className="text-sm font-medium uppercase tracking-wide mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Today&apos;s Log
          </h2>
          <ul className="space-y-2">
            {todayEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between py-2 border-b"
                style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}
              >
                <div>
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {entry.meal_description || entry.meal_type}
                  </span>
                  <span
                    className="text-xs ml-2 font-mono"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {new Date(entry.created_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-sm font-mono font-semibold"
                    style={{ color: "var(--teal)" }}
                  >
                    +{entry.protein_grams}g
                  </span>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={isPending}
                    className="text-xs px-2 py-1 rounded transition-colors"
                    style={{ color: "var(--text-tertiary)" }}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Weekly overview */}
      <section className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-sm font-medium uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            Last 7 Days
          </h2>
          <span
            className="text-sm font-mono"
            style={{ color: "var(--text-tertiary)" }}
          >
            avg: {weeklyAvg}g/day
          </span>
        </div>

        {/* Simple bar chart */}
        <div className="flex items-end gap-1.5" style={{ height: "100px" }}>
          {weeklyData.map((day) => {
            const height =
              maxWeekly > 0 ? (day.total / maxWeekly) * 100 : 0;
            const isToday =
              day.date === new Date().toISOString().split("T")[0];
            const hitGoal = day.total >= proteinTarget;

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span
                  className="text-[9px] font-mono tabular-nums"
                  style={{
                    color: day.total > 0 ? "var(--text-tertiary)" : "transparent",
                  }}
                >
                  {day.total}
                </span>
                <div
                  className="w-full rounded-sm transition-all duration-300"
                  style={{
                    height: `${Math.max(height, 2)}%`,
                    background: hitGoal
                      ? "var(--success)"
                      : day.total > 0
                        ? "var(--teal)"
                        : "rgba(255, 255, 255, 0.06)",
                    opacity: isToday ? 1 : 0.7,
                    boxShadow: isToday ? "0 0 8px rgba(45, 212, 191, 0.3)" : "none",
                  }}
                />
                <span
                  className="text-[10px]"
                  style={{
                    color: isToday
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                    fontWeight: isToday ? 600 : 400,
                  }}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Target line label */}
        <div className="flex items-center gap-2 mt-3">
          <div
            className="flex-1 h-px"
            style={{ background: "rgba(255, 255, 255, 0.1)" }}
          />
          <span
            className="text-[10px] font-mono"
            style={{ color: "var(--text-tertiary)" }}
          >
            target: {proteinTarget}g
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: "rgba(255, 255, 255, 0.1)" }}
          />
        </div>
      </section>

      <p
        className="text-[11px] text-center italic pb-4"
        style={{ color: "var(--text-tertiary)" }}
      >
        Hit your protein. Fill the rest with whatever keeps you sane.
      </p>
    </div>
  );
}
