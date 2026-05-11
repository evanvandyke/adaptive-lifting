"use client";

import { useState } from "react";

export function RPEGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium transition-colors"
        style={{ color: "var(--text-tertiary)" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        What is RPE?
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
      </button>

      {open && (
        <div
          className="mt-2 glass-card p-4 space-y-2 text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>
            RPE = Rate of Perceived Exertion
          </p>
          <p>How hard the set felt — how many reps you had left in the tank:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            <span style={{ color: "var(--success)" }}>RPE 6-7</span>
            <span>3-4 reps left — felt easy</span>
            <span style={{ color: "var(--teal)" }}>RPE 8</span>
            <span>2 reps left — solid effort</span>
            <span style={{ color: "var(--amber)" }}>RPE 9</span>
            <span>1 rep left — very hard</span>
            <span style={{ color: "var(--error)" }}>RPE 10</span>
            <span>Max effort — nothing left</span>
          </div>
          <p className="mt-2" style={{ color: "var(--text-tertiary)" }}>
            Most training sets should be RPE 7-8. The app uses your RPE to auto-adjust weights.
          </p>
        </div>
      )}
    </div>
  );
}
