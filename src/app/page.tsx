import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      {/* Hero */}
      <div className="text-center max-w-xl mb-16">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="velvet-dot" />
          <span
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: "var(--text-tertiary)" }}
          >
            Adaptive Lifting
          </span>
          <div className="velvet-dot" />
        </div>

        <h1
          className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Show up.
          <br />
          Get stronger.
          <br />
          <span style={{ color: "var(--teal)" }}>Don&apos;t quit.</span>
        </h1>

        <p
          className="text-lg leading-relaxed max-w-md mx-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          Strength training that adapts to you. No cookie-cutter programs,
          no guesswork &mdash; just progressive overload that actually works.
        </p>
      </div>

      {/* Value Props */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full mb-12">
        <div className="glass-card p-5 text-center">
          <div
            className="text-2xl font-bold mb-1"
            style={{ color: "var(--teal)" }}
          >
            Auto-Adjust
          </div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Weights and volume adjust based on your performance, not a
            spreadsheet
          </p>
        </div>
        <div className="glass-card p-5 text-center">
          <div
            className="text-2xl font-bold mb-1"
            style={{ color: "var(--amber)" }}
          >
            RPE-Driven
          </div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Rate your effort, and the program responds &mdash; harder days,
            easier days, all calibrated
          </p>
        </div>
        <div className="glass-card p-5 text-center">
          <div
            className="text-2xl font-bold mb-1"
            style={{ color: "var(--teal)" }}
          >
            Just Show Up
          </div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Open the app, do the work, log the sets. We handle the
            programming
          </p>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link href="/signup" className="btn-primary text-center px-8 py-3">
          Get Started
        </Link>
        <Link href="/login" className="btn-secondary text-center px-8 py-3">
          Sign In
        </Link>
      </div>
    </div>
  );
}
