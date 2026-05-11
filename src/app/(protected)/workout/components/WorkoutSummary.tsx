"use client";

import SharePR from "./SharePR";

interface WorkoutSummaryProps {
  summary: {
    totalVolume: number;
    setsCompleted: number;
    totalSets: number;
    avgRpe: number | null;
    prs: string[];
  };
  onDismiss: () => void;
  totalSessions?: number;
  streakCount?: number;
}

export default function WorkoutSummary({
  summary,
  onDismiss,
  totalSessions,
  streakCount,
}: WorkoutSummaryProps) {
  const completionRate = Math.round(
    (summary.setsCompleted / summary.totalSets) * 100
  );

  const messages = [
    "Solid work. Consistency is the strategy.",
    "Another session in the books. Stronger than yesterday.",
    "That's how it's done. Show up, execute, repeat.",
    "The work speaks for itself. Rest up.",
    "Progress isn't always visible. But it's always happening.",
  ];
  const motivationalMessage = messages[Math.floor(Math.random() * messages.length)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="glass-card w-full max-w-sm overflow-hidden"
        style={{
          borderColor: "var(--velvet)",
          boxShadow: "0 0 40px rgba(139, 41, 66, 0.15)",
        }}
      >
        {/* Velvet accent bar */}
        <div
          className="h-1 w-full"
          style={{
            background:
              "linear-gradient(90deg, var(--velvet), var(--teal), var(--velvet))",
          }}
        />

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-text-primary">
              Workout Complete
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              {motivationalMessage}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold font-mono text-teal">
                {summary.totalVolume.toLocaleString()}
              </p>
              <p className="text-xs text-text-tertiary mt-1 uppercase tracking-wider">
                Total Volume (lbs)
              </p>
            </div>

            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold font-mono text-teal">
                {summary.setsCompleted}/{summary.totalSets}
              </p>
              <p className="text-xs text-text-tertiary mt-1 uppercase tracking-wider">
                Sets Completed
              </p>
            </div>

            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold font-mono text-teal">
                {summary.avgRpe != null ? summary.avgRpe.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-text-tertiary mt-1 uppercase tracking-wider">
                Avg RPE
              </p>
            </div>

            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold font-mono text-teal">
                {completionRate}%
              </p>
              <p className="text-xs text-text-tertiary mt-1 uppercase tracking-wider">
                Completion
              </p>
            </div>
          </div>

          {/* PRs */}
          {summary.prs.length > 0 && (
            <div className="glass-card p-4" style={{ borderColor: "var(--amber)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber text-lg">🏆</span>
                <p className="text-amber font-semibold text-sm uppercase tracking-wider">
                  New Personal Records
                </p>
              </div>
              <ul className="space-y-2">
                {summary.prs.map((pr, i) => {
                  // Parse "Exercise Name: 225 lbs" format
                  const match = pr.match(/^(.+):\s*(\d+(?:\.\d+)?)\s*lbs$/);
                  const exerciseName = match ? match[1] : pr;
                  const weight = match ? parseFloat(match[2]) : 0;

                  return (
                    <li
                      key={i}
                      className="flex items-center justify-between pl-6"
                    >
                      <span className="text-text-primary text-sm font-mono">
                        {pr}
                      </span>
                      {match && (
                        <SharePR
                          exerciseName={exerciseName}
                          weight={weight}
                          totalSessions={totalSessions}
                          streakCount={streakCount}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            className="btn-primary w-full !py-3 !text-base font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
