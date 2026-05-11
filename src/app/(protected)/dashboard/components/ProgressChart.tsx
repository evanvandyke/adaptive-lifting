"use client";

import { useState } from "react";

export interface DataPoint {
  label: string;
  value: number;
}

interface ProgressChartProps {
  data: DataPoint[];
  title: string;
  unit?: string;
  color?: "teal" | "amber";
  height?: number;
}

export function ProgressChart({
  data,
  title,
  unit = "",
  color = "teal",
  height = 160,
}: ProgressChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="glass-card p-5">
        <h3
          className="text-sm font-medium mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          {title}
        </h3>
        <div
          className="flex items-center justify-center"
          style={{ height, color: "var(--text-tertiary)" }}
        >
          <p className="text-sm">No data yet</p>
        </div>
      </div>
    );
  }

  const strokeColor = color === "teal" ? "var(--teal)" : "var(--amber)";
  const fillColor =
    color === "teal" ? "rgba(45, 212, 191, 0.08)" : "rgba(244, 162, 97, 0.08)";
  const dotFill =
    color === "teal" ? "rgba(45, 212, 191, 0.3)" : "rgba(244, 162, 97, 0.3)";

  const padding = { top: 12, right: 12, bottom: 28, left: 12 };
  const chartWidth = 100; // percentage-based, we use viewBox
  const svgWidth = 360;
  const svgHeight = height;
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const yPad = range * 0.1;

  const scaleX = (i: number) =>
    padding.left + (i / Math.max(data.length - 1, 1)) * plotWidth;
  const scaleY = (v: number) =>
    padding.top +
    plotHeight -
    ((v - (minVal - yPad)) / (range + 2 * yPad)) * plotHeight;

  const points = data.map((d, i) => ({ x: scaleX(i), y: scaleY(d.value) }));

  // Build line path
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Build area path (filled below line)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    svgHeight - padding.bottom
  } L ${points[0].x} ${svgHeight - padding.bottom} Z`;

  return (
    <div className="glass-card p-5">
      <h3
        className="text-sm font-medium mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        {title}
      </h3>
      <div className="relative">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full"
          style={{ height }}
          preserveAspectRatio="none"
          onMouseLeave={() => setActiveIndex(null)}
          onTouchEnd={() => setActiveIndex(null)}
        >
          {/* Area fill */}
          <path d={areaPath} fill={fillColor} />
          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* Data points and hit areas */}
          {points.map((p, i) => (
            <g key={i}>
              {/* Invisible larger hit area for touch/hover */}
              <circle
                cx={p.x}
                cy={p.y}
                r={16}
                fill="transparent"
                onMouseEnter={() => setActiveIndex(i)}
                onTouchStart={() => setActiveIndex(i)}
                style={{ cursor: "pointer" }}
              />
              {/* Visible dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={activeIndex === i ? 5 : 3}
                fill={activeIndex === i ? strokeColor : dotFill}
                stroke={strokeColor}
                strokeWidth={activeIndex === i ? 2 : 0}
                style={{ transition: "r 0.15s ease, fill 0.15s ease" }}
              />
            </g>
          ))}
          {/* X-axis labels — first and last only */}
          <text
            x={points[0].x}
            y={svgHeight - 6}
            textAnchor="start"
            fill="var(--text-tertiary)"
            fontSize="11"
          >
            {data[0].label}
          </text>
          <text
            x={points[points.length - 1].x}
            y={svgHeight - 6}
            textAnchor="end"
            fill="var(--text-tertiary)"
            fontSize="11"
          >
            {data[data.length - 1].label}
          </text>
        </svg>
        {/* Tooltip */}
        {activeIndex !== null && (
          <div
            className="absolute pointer-events-none px-2.5 py-1.5 rounded-md text-xs font-medium"
            style={{
              left: `${(points[activeIndex].x / svgWidth) * 100}%`,
              top: `${(points[activeIndex].y / svgHeight) * 100 - 14}%`,
              transform: "translateX(-50%)",
              background: "rgba(11, 15, 26, 0.9)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
            }}
          >
            {data[activeIndex].value}
            {unit} · {data[activeIndex].label}
          </div>
        )}
      </div>
    </div>
  );
}
