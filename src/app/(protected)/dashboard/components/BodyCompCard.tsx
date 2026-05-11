"use client";

import { useState, useTransition } from "react";
import { logBodyComposition } from "../../profile/body-comp-actions";

interface BodyCompEntry {
  id: string;
  date: string;
  weight: number;
  waist_inches: number;
  neck_inches: number;
  estimated_bf_pct: number;
  lean_mass: number;
  fat_mass: number;
}

interface BodyCompCardProps {
  history: BodyCompEntry[];
  hasHeight: boolean;
}

export function BodyCompCard({ history, hasHeight }: BodyCompCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [neck, setNeck] = useState("");

  const latest = history.length > 0 ? history[history.length - 1] : null;

  // Calculate trend — compare latest to earliest in history
  const earliest = history.length > 1 ? history[0] : null;
  const bfTrend =
    latest && earliest
      ? Math.round((latest.estimated_bf_pct - earliest.estimated_bf_pct) * 10) / 10
      : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const w = parseFloat(weight);
    const wa = parseFloat(waist);
    const n = parseFloat(neck);

    if (isNaN(w) || isNaN(wa) || isNaN(n)) {
      setError("Please fill in all measurements.");
      return;
    }
    if (wa <= n) {
      setError("Waist must be larger than neck.");
      return;
    }

    startTransition(async () => {
      try {
        await logBodyComposition(w, wa, n);
        setShowForm(false);
        setWeight("");
        setWaist("");
        setNeck("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  // Build mini sparkline for bf% trend
  const chartData = history.map((h) => h.estimated_bf_pct);
  const chartMin = chartData.length > 0 ? Math.min(...chartData) - 1 : 0;
  const chartMax = chartData.length > 0 ? Math.max(...chartData) + 1 : 30;
  const chartRange = chartMax - chartMin || 1;

  function buildSparklinePath(): string {
    if (chartData.length < 2) return "";
    const w = 240;
    const h = 48;
    const stepX = w / (chartData.length - 1);

    return chartData
      .map((val, i) => {
        const x = i * stepX;
        const y = h - ((val - chartMin) / chartRange) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  if (!hasHeight) {
    return (
      <section className="glass-card p-5">
        <h2
          className="text-sm font-medium uppercase tracking-wide mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          Body Composition
        </h2>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          Set your height in your profile to enable body fat estimation.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-sm font-medium uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          Body Composition
        </h2>
        {latest && (
          <span
            className="text-[10px] font-mono"
            style={{ color: "var(--text-tertiary)" }}
          >
            {new Date(latest.date + "T12:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>

      {latest ? (
        <>
          {/* Big BF% number */}
          <div className="flex items-baseline gap-3 mb-3">
            <span
              className="text-3xl font-bold tabular-nums"
              style={{ color: "var(--teal)" }}
            >
              {latest.estimated_bf_pct}%
            </span>
            {bfTrend !== null && bfTrend !== 0 && (
              <span
                className="text-sm font-mono"
                style={{
                  color: bfTrend < 0 ? "var(--success)" : "var(--amber)",
                }}
              >
                {bfTrend > 0 ? "+" : ""}
                {bfTrend}%
              </span>
            )}
            <span
              className="text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              est. body fat
            </span>
          </div>

          {/* Lean vs Fat mass bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-xs font-mono"
                style={{ color: "var(--teal)" }}
              >
                {latest.lean_mass} lbs lean
              </span>
              <span
                className="text-xs font-mono"
                style={{ color: "var(--amber)" }}
              >
                {latest.fat_mass} lbs fat
              </span>
            </div>
            <div
              className="h-2.5 rounded-full overflow-hidden flex"
              style={{ background: "rgba(255, 255, 255, 0.08)" }}
            >
              <div
                className="h-full rounded-l-full transition-all duration-500"
                style={{
                  width: `${(latest.lean_mass / latest.weight) * 100}%`,
                  background: "var(--teal)",
                }}
              />
              <div
                className="h-full rounded-r-full transition-all duration-500"
                style={{
                  width: `${(latest.fat_mass / latest.weight) * 100}%`,
                  background: "var(--amber)",
                  opacity: 0.7,
                }}
              />
            </div>
          </div>

          {/* Sparkline trend */}
          {chartData.length >= 2 && (
            <div className="mb-4">
              <svg
                viewBox={`0 0 240 48`}
                className="w-full"
                style={{ height: 48 }}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="bfGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--teal)"
                      stopOpacity="0.3"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--teal)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                <path
                  d={`${buildSparklinePath()} L240,48 L0,48 Z`}
                  fill="url(#bfGradient)"
                />
                {/* Line */}
                <path
                  d={buildSparklinePath()}
                  fill="none"
                  stroke="var(--teal)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p
                className="text-[10px] text-center mt-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                BF% over {chartData.length} entries
              </p>
            </div>
          )}
        </>
      ) : (
        <p
          className="text-sm mb-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          No measurements yet. Log your first to start tracking.
        </p>
      )}

      {/* Form toggle */}
      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              className="text-xs block mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Weight (lbs)
            </label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="glass-input w-full text-sm px-3 py-2"
              placeholder="185"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs block mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Waist at navel (in)
              </label>
              <input
                type="number"
                step="0.25"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                className="glass-input w-full text-sm px-3 py-2"
                placeholder="34"
              />
            </div>
            <div>
              <label
                className="text-xs block mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Neck (in)
              </label>
              <input
                type="number"
                step="0.25"
                value={neck}
                onChange={(e) => setNeck(e.target.value)}
                className="glass-input w-full text-sm px-3 py-2"
                placeholder="15.5"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "var(--amber)" }}>
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary flex-1 text-sm"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="btn-secondary flex-1 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98]"
          style={{
            background: "rgba(45, 212, 191, 0.1)",
            color: "var(--teal)",
            border: "1px solid rgba(45, 212, 191, 0.2)",
          }}
        >
          📏 Log Measurements
        </button>
      )}

      <p
        className="text-[10px] mt-3 text-center italic"
        style={{ color: "var(--text-tertiary)" }}
      >
        Navy Method estimate — measure consistently for best tracking.
      </p>
    </section>
  );
}
