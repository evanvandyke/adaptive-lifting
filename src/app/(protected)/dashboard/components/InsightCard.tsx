interface InsightCardProps {
  recommendation: string | null;
}

export function InsightCard({ recommendation }: InsightCardProps) {
  const hasInsight = recommendation && recommendation.trim().length > 0;

  return (
    <div
      className="glass-card p-5 relative overflow-hidden"
      style={{
        borderColor: "rgba(139, 41, 66, 0.25)",
      }}
    >
      {/* Velvet dot accent */}
      <div
        className="velvet-dot absolute"
        style={{ top: 16, right: 16 }}
      />

      <h3
        className="text-sm font-medium mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        AI Insights
      </h3>

      {hasInsight ? (
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-primary)" }}
        >
          {recommendation}
        </p>
      ) : (
        <div className="py-2">
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-tertiary)" }}
          >
            Complete your first week to unlock AI insights. The system needs a
            few sessions to learn your patterns and start making recommendations.
          </p>
        </div>
      )}

      <p
        className="mt-4 text-[10px] uppercase tracking-widest"
        style={{ color: "var(--text-tertiary)" }}
      >
        Powered by AI
      </p>
    </div>
  );
}
