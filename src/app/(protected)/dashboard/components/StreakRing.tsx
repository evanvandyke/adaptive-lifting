"use client";

interface StreakRingProps {
  current: number;
  target: number;
  streak: number;
}

export function StreakRing({ current, target, streak }: StreakRingProps) {
  const radius = 52;
  const stroke = 6;
  const normalizedRadius = radius - stroke;
  const circumference = 2 * Math.PI * normalizedRadius;
  const progress = Math.min(current / Math.max(target, 1), 1);
  const strokeDashoffset = circumference - progress * circumference;
  const isComplete = current >= target;
  const onTrack = current >= Math.floor((target * new Date().getDay()) / 7);

  const accentColor = isComplete
    ? "var(--teal)"
    : onTrack
      ? "var(--teal)"
      : "var(--amber)";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
        <svg
          width={radius * 2}
          height={radius * 2}
          viewBox={`0 0 ${radius * 2} ${radius * 2}`}
          className="transform -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="var(--glass-border)"
            strokeWidth={stroke}
          />
          {/* Progress arc */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={accentColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease",
              filter: isComplete ? `drop-shadow(0 0 8px ${accentColor})` : "none",
            }}
          />
        </svg>
        {/* Center content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: accentColor }}
          >
            {current}/{target}
          </span>
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            this week
          </span>
        </div>
        {/* Glow pulse when complete */}
        {isComplete && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`,
              animation: "pulse-glow 2s ease-in-out infinite",
            }}
          />
        )}
      </div>
      <div className="text-center">
        <p
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {streak} week streak
        </p>
      </div>
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
