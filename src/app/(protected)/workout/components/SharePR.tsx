"use client";

import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import PRShareCard from "@/components/PRShareCard";

interface SharePRProps {
  exerciseName: string;
  weight: number;
  totalSessions?: number;
  streakCount?: number;
}

export default function SharePR({
  exerciseName,
  weight,
  totalSessions,
  streakCount,
}: SharePRProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "downloading" | "downloaded" | "error">("idle");
  const cardRef = useRef<HTMLDivElement>(null);

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const generateImage = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    if (!cardRef.current) return null;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0B0F1A",
        scale: 3,
        useCORS: true,
        logging: false,
      });
      return canvas;
    } catch {
      return null;
    }
  }, []);

  const handleCopy = async () => {
    setStatus("copying");
    try {
      const canvas = await generateImage();
      if (!canvas) {
        setStatus("error");
        return;
      }
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) {
        setStatus("error");
        return;
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const handleDownload = async () => {
    setStatus("downloading");
    try {
      const canvas = await generateImage();
      if (!canvas) {
        setStatus("error");
        return;
      }
      const link = document.createElement("a");
      link.download = `PR-${exerciseName.replace(/\s+/g, "-")}-${weight}lbs.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setStatus("downloaded");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-ghost text-xs flex items-center gap-1"
        style={{ color: "var(--teal)" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Share
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-sm overflow-hidden">
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-text-primary font-semibold text-sm">
                  Share Your PR
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Card preview — scaled down to fit modal */}
              <div className="flex justify-center">
                <div style={{ transform: "scale(0.75)", transformOrigin: "top center" }}>
                  <PRShareCard
                    ref={cardRef}
                    exerciseName={exerciseName}
                    weight={weight}
                    date={dateStr}
                    totalSessions={totalSessions}
                    streakCount={streakCount}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCopy}
                  disabled={status === "copying"}
                  className="btn-secondary flex-1 text-sm"
                >
                  {status === "copied"
                    ? "Copied!"
                    : status === "copying"
                      ? "Copying..."
                      : "Copy to Clipboard"}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={status === "downloading"}
                  className="btn-primary flex-1 text-sm"
                >
                  {status === "downloaded"
                    ? "Saved!"
                    : status === "downloading"
                      ? "Saving..."
                      : "Download"}
                </button>
              </div>

              {status === "error" && (
                <p className="text-center text-xs" style={{ color: "var(--error)" }}>
                  Something went wrong. Try downloading instead.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
