"use client";

import { useState } from "react";

interface ExerciseSwapSuggestionProps {
  exerciseName: string;
  muscleGroup: string;
  stallDuration: number;
  currentWeight: number;
  onAcceptSwap?: (suggestion: string) => void;
  onDismiss?: () => void;
}

export function ExerciseSwapSuggestion({
  exerciseName,
  muscleGroup,
  stallDuration,
  currentWeight,
  onAcceptSwap,
  onDismiss,
}: ExerciseSwapSuggestionProps) {
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchSuggestions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/exercise-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName,
          muscleGroup,
          stallDuration,
          currentWeight,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSuggestions(data.suggestions);
      }
    } catch {
      setError("Failed to load suggestions. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  if (dismissed) return null;

  return (
    <div
      className="rounded-lg p-4 mt-3"
      style={{
        background: "rgba(244, 162, 97, 0.08)",
        border: "1px solid rgba(244, 162, 97, 0.25)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--amber)" }}
          >
            ⚠️ Stalled {stallDuration}+ weeks
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs px-1.5 py-0.5 rounded transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>

      {!suggestions && !loading && !error && (
        <div className="mt-3">
          <p
            className="text-sm mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Stuck on {exerciseName} at {currentWeight} lbs? Get AI-powered
            alternatives.
          </p>
          <button
            onClick={fetchSuggestions}
            className="text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-150 active:scale-95"
            style={{
              background: "rgba(244, 162, 97, 0.15)",
              color: "var(--amber)",
              border: "1px solid rgba(244, 162, 97, 0.3)",
            }}
          >
            Suggest alternatives
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-3 flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ background: "var(--amber)" }}
          />
          <span
            className="text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            Finding alternatives...
          </span>
        </div>
      )}

      {error && (
        <div className="mt-3">
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {error}
          </p>
          <button
            onClick={fetchSuggestions}
            className="text-xs mt-2 underline"
            style={{ color: "var(--amber)" }}
          >
            Try again
          </button>
        </div>
      )}

      {suggestions && (
        <div className="mt-3">
          <p
            className="text-sm leading-relaxed whitespace-pre-line"
            style={{ color: "var(--text-primary)" }}
          >
            {suggestions}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onAcceptSwap?.(suggestions)}
              className="text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-150 active:scale-95"
              style={{
                background: "rgba(45, 212, 191, 0.15)",
                color: "var(--teal)",
                border: "1px solid rgba(45, 212, 191, 0.3)",
              }}
            >
              Swap exercise
            </button>
            <button
              onClick={handleDismiss}
              className="btn-ghost text-xs px-3 py-1.5"
            >
              Keep current
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
