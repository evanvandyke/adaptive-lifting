import { ADVANCED_TEMPLATES } from "@/lib/types";

interface PeriodizationCardProps {
  weeksTraining: number;
}

type Phase = {
  name: string;
  color: string;
  weekRange: string;
  description: string;
  physiologicalDetail: string;
  changes: string;
  advanceWhen: string;
};

const PHASES: Phase[] = [
  {
    name: "Neural Adaptation",
    color: "#34D399",
    weekRange: "Weeks 1-3",
    description:
      "Your nervous system is learning to recruit muscle fibers efficiently. Strength gains come from coordination, not muscle growth.",
    physiologicalDetail:
      "Motor unit recruitment, intermuscular coordination, and movement pattern optimization are driving your progress.",
    changes: "Focus on form and consistency. Weight increases will come fast — that's neurological, not muscular.",
    advanceWhen: "After 3 weeks of consistent training (3x/week).",
  },
  {
    name: "Linear Progression",
    color: "#2DD4BF",
    weekRange: "Weeks 4-8",
    description:
      "You're adding weight session to session. This is the golden window — ride it as long as possible.",
    physiologicalDetail:
      "Myofibrillar hypertrophy begins. Tendons and connective tissue are strengthening. Your body is adapting to progressive overload.",
    changes: "Keep adding weight each session. If you stall, deload 10% and build back up.",
    advanceWhen: "When linear gains slow (2+ sessions stalling on same weight).",
  },
  {
    name: "Volume Accumulation",
    color: "#F4A261",
    weekRange: "Weeks 8-12",
    description:
      "Time to increase training volume. Consider adding a 4th set to your main compound lifts.",
    physiologicalDetail:
      "Sarcoplasmic hypertrophy increases. More volume drives greater metabolic stress and mechanical tension — key drivers of muscle growth.",
    changes: "Increase sets from 3 to 4 on compound movements. Recovery becomes more important.",
    advanceWhen: "When you can handle 4 sets across all compounds with RPE under 8.",
  },
  {
    name: "Ready to Split",
    color: "#8B2942",
    weekRange: "Weeks 12+",
    description:
      "Full-body sessions may not provide enough volume per muscle group. An upper/lower split lets you train more per session.",
    physiologicalDetail:
      "At this stage, each muscle group needs more targeted volume and recovery time. Splitting allows higher per-session volume while maintaining frequency.",
    changes: "Transition from 3x full-body to 4x upper/lower. See the suggested split below.",
    advanceWhen: "You're here. Consider the 4-day upper/lower split when ready.",
  },
];

function getPhaseIndex(weeks: number): number {
  if (weeks < 4) return 0;
  if (weeks < 8) return 1;
  if (weeks < 12) return 2;
  return 3;
}

export default function PeriodizationCard({ weeksTraining }: PeriodizationCardProps) {
  const phaseIndex = getPhaseIndex(weeksTraining);
  const currentPhase = PHASES[phaseIndex];

  return (
    <div className="space-y-4">
      {/* Current Phase Card */}
      <div
        className="glass-card p-5 space-y-4"
        style={{
          borderColor: currentPhase.color,
          boxShadow: `0 0 20px ${currentPhase.color}20`,
        }}
      >
        {/* Phase indicator bar */}
        <div
          className="h-1 w-full rounded-full"
          style={{ background: currentPhase.color }}
        />

        <div className="flex items-start justify-between">
          <div>
            <h3
              className="text-lg font-bold"
              style={{ color: currentPhase.color }}
            >
              {currentPhase.name}
            </h3>
            <p
              className="text-xs uppercase tracking-wider mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {currentPhase.weekRange}
            </p>
          </div>
          <div
            className="glass-card px-3 py-1.5 text-center"
            style={{ borderColor: currentPhase.color }}
          >
            <p
              className="text-xl font-bold font-mono"
              style={{ color: currentPhase.color }}
            >
              {weeksTraining}
            </p>
            <p
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Weeks
            </p>
          </div>
        </div>

        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-primary)" }}
        >
          {currentPhase.description}
        </p>

        <div
          className="glass-card p-3 space-y-1"
          style={{
            background: "rgba(11, 15, 26, 0.65)",
          }}
        >
          <p
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--text-secondary)" }}
          >
            What&apos;s happening
          </p>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--text-tertiary)" }}
          >
            {currentPhase.physiologicalDetail}
          </p>
        </div>

        <div
          className="glass-card p-3 space-y-1"
          style={{
            background: "rgba(11, 15, 26, 0.65)",
          }}
        >
          <p
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--text-secondary)" }}
          >
            What to expect
          </p>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--text-tertiary)" }}
          >
            {currentPhase.changes}
          </p>
        </div>

        <div
          className="flex items-center gap-2 pt-1"
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: currentPhase.color }}
          />
          <p
            className="text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="font-medium">Next phase:</span>{" "}
            {currentPhase.advanceWhen}
          </p>
        </div>
      </div>

      {/* Phase timeline */}
      <div className="glass-card p-5 space-y-3">
        <h3
          className="text-sm font-medium uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          Training Timeline
        </h3>
        <div className="space-y-2">
          {PHASES.map((phase, i) => {
            const isActive = i === phaseIndex;
            const isPast = i < phaseIndex;
            return (
              <div
                key={phase.name}
                className="flex items-center gap-3"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0 transition-all"
                  style={{
                    background: isActive || isPast ? phase.color : "var(--text-tertiary)",
                    boxShadow: isActive ? `0 0 8px ${phase.color}` : "none",
                    opacity: isPast ? 0.5 : 1,
                  }}
                />
                <div className="flex-1 flex items-center justify-between">
                  <p
                    className="text-sm"
                    style={{
                      color: isActive
                        ? phase.color
                        : isPast
                          ? "var(--text-tertiary)"
                          : "var(--text-secondary)",
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {phase.name}
                  </p>
                  <p
                    className="text-xs font-mono"
                    style={{
                      color: isActive ? phase.color : "var(--text-tertiary)",
                    }}
                  >
                    {phase.weekRange}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advanced split preview — only show at weeks 12+ */}
      {phaseIndex === 3 && (
        <div className="glass-card p-5 space-y-4">
          <div>
            <h3
              className="text-sm font-medium uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}
            >
              Suggested 4-Day Upper/Lower Split
            </h3>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              When you&apos;re ready, this program increases per-muscle volume while maintaining frequency.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {ADVANCED_TEMPLATES.map((template) => (
              <div
                key={template.type}
                className="glass-card p-3 space-y-2"
                style={{
                  background: "rgba(11, 15, 26, 0.65)",
                }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: template.type.startsWith("U")
                      ? "var(--teal)"
                      : "var(--amber)",
                  }}
                >
                  {template.name}
                </p>
                <div className="space-y-1">
                  {template.exercises.map((ex) => (
                    <div
                      key={ex.exerciseName}
                      className="flex items-center justify-between"
                    >
                      <p
                        className="text-xs truncate mr-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {ex.exerciseName}
                      </p>
                      <p
                        className="text-[10px] font-mono shrink-0"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {ex.sets}x{ex.targetReps}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
