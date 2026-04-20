"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Circular probability gauge. Two concentric rings: outer = predicted
 * probability, inner thin ring = 95% confidence band.
 */
export function ProbabilityRing({
  probability,
  ciLow,
  ciHigh,
  size = 240,
  stroke = 14,
}: {
  probability: number;
  ciLow: number;
  ciHigh: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = probability;
  const complex = pct >= 0.5;

  const colorClass = complex ? "text-destructive" : "text-primary";
  const bgClass = "text-muted";

  const innerRadius = radius - stroke - 6;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const ciWidth = ciHigh - ciLow;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className={bgClass}
          strokeLinecap="round"
        />
        {/* main probability arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={colorClass}
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ type: "spring", stiffness: 100, damping: 22 }}
        />
        {/* CI band — inner ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className={cn(colorClass, "opacity-50")}
          strokeDasharray={innerCircumference}
          initial={false}
          animate={{
            strokeDashoffset: innerCircumference * (1 - ciWidth),
            rotate: ciLow * 360,
          }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: "center" }}
        />
      </svg>

      {/* center label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={Math.round(pct * 100)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "font-mono text-5xl font-semibold tabular-nums",
            colorClass,
          )}
        >
          {(pct * 100).toFixed(1)}
          <span className="text-2xl">%</span>
        </motion.span>
        <span className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          P(≥13 sections)
        </span>
        <span className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
          95% CI {(ciLow * 100).toFixed(1)}–{(ciHigh * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
