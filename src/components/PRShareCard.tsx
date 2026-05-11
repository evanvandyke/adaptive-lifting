"use client";

import { forwardRef } from "react";

interface PRShareCardProps {
  exerciseName: string;
  weight: number;
  date: string;
  totalSessions?: number;
  streakCount?: number;
}

const PRShareCard = forwardRef<HTMLDivElement, PRShareCardProps>(
  function PRShareCard({ exerciseName, weight, date, totalSessions, streakCount }, ref) {
    return (
      <div
        ref={ref}
        style={{
          width: 360,
          height: 640,
          background: "#0B0F1A",
          borderRadius: 24,
          border: "2px solid #8B2942",
          boxShadow:
            "0 0 60px rgba(139, 41, 66, 0.3), 0 0 120px rgba(139, 41, 66, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          position: "relative",
          overflow: "hidden",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Subtle radial glow behind the weight */}
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(45, 212, 191, 0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background:
              "linear-gradient(90deg, #8B2942, #2DD4BF, #8B2942)",
          }}
        />

        {/* Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#F4A261",
              marginBottom: 8,
            }}
          >
            🏆 New Personal Record
          </p>
        </div>

        {/* Exercise name */}
        <p
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "#F0EDE8",
            letterSpacing: 0.5,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          {exerciseName}
        </p>

        {/* Weight - the hero */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#2DD4BF",
              lineHeight: 1,
              letterSpacing: -2,
              textShadow: "0 0 40px rgba(45, 212, 191, 0.3)",
            }}
          >
            {weight}
          </p>
          <p
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "#7A8BA3",
              letterSpacing: 3,
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            lbs
          </p>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginBottom: 40,
          }}
        >
          {streakCount != null && streakCount > 0 && (
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#F0EDE8",
                  fontFamily: "monospace",
                }}
              >
                {streakCount}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: "#4A5568",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                Streak
              </p>
            </div>
          )}
          {totalSessions != null && totalSessions > 0 && (
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#F0EDE8",
                  fontFamily: "monospace",
                }}
              >
                {totalSessions}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: "#4A5568",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                Sessions
              </p>
            </div>
          )}
        </div>

        {/* Date */}
        <p
          style={{
            fontSize: 12,
            color: "#4A5568",
            letterSpacing: 1,
            marginBottom: 20,
          }}
        >
          {date}
        </p>

        {/* Branding */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#7A8BA3",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Adaptive Lifting
          </p>
        </div>
      </div>
    );
  }
);

export default PRShareCard;
