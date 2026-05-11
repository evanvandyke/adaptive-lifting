"use client";

import { useState } from "react";

export function NutritionCoachCard() {
  const [coaching, setCoaching] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchCoaching() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setCoaching(data.coaching);
      }
    } catch {
      setError("Failed to load coaching. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className="glass-card p-5"
      style={{
        borderLeft: "3px solid var(--velvet)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-sm font-medium uppercase tracking-wide"
          style={{ color: "var(--velvet)" }}
        >
          🧠 AI Coach
        </h2>
        {coaching && (
          <button
            onClick={fetchCoaching}
            disabled={loading}
            className="text-[10px] font-mono underline"
            style={{ color: "var(--text-tertiary)" }}
          >
            refresh
          </button>
        )}
      </div>

      {!coaching && !loading && !error && (
        <div>
          <p
            className="text-sm mb-3 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Get personalized nutrition coaching based on your protein logs and
            weight trend.
          </p>
          <button
            onClick={fetchCoaching}
            className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-150 active:scale-95"
            style={{
              background: "rgba(139, 41, 66, 0.2)",
              color: "var(--velvet)",
              border: "1px solid rgba(139, 41, 66, 0.35)",
            }}
          >
            Get Coaching
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-2">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ background: "var(--velvet)" }}
          />
          <span
            className="text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            Analyzing your data...
          </span>
        </div>
      )}

      {error && (
        <div>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {error}
          </p>
          <button
            onClick={fetchCoaching}
            className="text-xs mt-2 underline"
            style={{ color: "var(--velvet)" }}
          >
            Try again
          </button>
        </div>
      )}

      {coaching && !loading && (
        <p
          className="text-sm leading-relaxed whitespace-pre-line"
          style={{ color: "var(--text-primary)" }}
        >
          {coaching}
        </p>
      )}
    </section>
  );
}
