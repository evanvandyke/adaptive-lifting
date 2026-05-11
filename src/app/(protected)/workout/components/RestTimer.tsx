"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface RestTimerProps {
  duration: number; // seconds
  onDismiss: () => void;
}

export default function RestTimer({ duration, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(duration);
  const [isActive, setIsActive] = useState(true);
  const hasNotified = useRef(false);

  const notify = useCallback(() => {
    if (hasNotified.current) return;
    hasNotified.current = true;

    // Vibration
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Audio beep
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 880;
      gain.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.3);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc2.connect(g2);
        g2.connect(ctx.destination);
        osc2.frequency.value = 1100;
        g2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 400);
    } catch {
      // Audio not available
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsActive(false);
          notify();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, notify]);

  const progress = 1 - remaining / duration;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - progress);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card p-8 flex flex-col items-center gap-6 max-w-xs w-full mx-4">
        <p className="text-text-secondary text-sm font-medium uppercase tracking-wider">
          Rest Timer
        </p>

        {/* Circular progress */}
        <div className="relative w-32 h-32">
          <svg
            className="w-full h-full -rotate-90"
            viewBox="0 0 120 120"
          >
            {/* Background ring */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--glass-border)"
              strokeWidth="6"
            />
            {/* Progress ring */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={remaining === 0 ? "var(--success)" : "var(--teal)"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          {/* Time text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`font-mono text-3xl font-bold ${
                remaining === 0 ? "text-success" : "text-text-primary"
              }`}
            >
              {timeDisplay}
            </span>
          </div>
        </div>

        {remaining === 0 && (
          <p className="text-success text-sm font-medium animate-pulse">
            Time to lift! 💪
          </p>
        )}

        <button
          onClick={onDismiss}
          className={`w-full py-3 rounded-lg font-medium text-base transition-all active:scale-[0.98] ${
            remaining === 0
              ? "btn-primary !py-3 !text-base"
              : "btn-ghost border border-glass-border"
          }`}
        >
          {remaining === 0 ? "Next Set" : "Skip Timer"}
        </button>
      </div>
    </div>
  );
}
