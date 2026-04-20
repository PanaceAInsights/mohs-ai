"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { PredictionFactor } from "@/lib/model";
import { cn } from "@/lib/utils";

/**
 * Per-feature contributions to the logit. Bars grow left for factors
 * pushing the prediction toward <13 sections and right for ≥13.
 */
export function FactorBars({
  factors,
  maxItems = 8,
}: {
  factors: PredictionFactor[];
  maxItems?: number;
}) {
  const shown = factors.slice(0, maxItems);
  const maxAbs = Math.max(
    0.1,
    ...shown.map((f) => Math.abs(f.contribution)),
  );

  return (
    <div className="space-y-1.5">
      {shown.map((f) => {
        const pct = (Math.abs(f.contribution) / maxAbs) * 50;
        const up = f.contribution > 0;
        return (
          <div
            key={f.feature}
            className="rounded-lg border border-border/60 bg-card/40 px-3 py-2"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-foreground/90">{f.label}</span>
              <span className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                {formatValue(f)}
                {f.direction === "up" && (
                  <ArrowUp className="h-3 w-3 text-destructive" />
                )}
                {f.direction === "down" && (
                  <ArrowDown className="h-3 w-3 text-primary" />
                )}
                {f.direction === "flat" && (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                )}
              </span>
            </div>
            <div className="mt-1.5 flex h-1 items-center">
              <div className="flex h-full w-1/2 justify-end">
                {!up && (
                  <motion.div
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 18 }}
                    className="h-full rounded-l-full bg-primary/80"
                  />
                )}
              </div>
              <div className="h-full w-px bg-border" />
              <div className="flex h-full w-1/2 justify-start">
                {up && (
                  <motion.div
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 18 }}
                    className={cn(
                      "h-full rounded-r-full",
                      f.contribution > 0 ? "bg-destructive/80" : "bg-muted",
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatValue(f: PredictionFactor): string {
  if (f.kind === "numeric") {
    const n = f.value as number;
    const rounded = Number.isInteger(n) ? String(n) : n.toFixed(2);
    if (typeof f.z === "number") return `${rounded}  (z ${f.z > 0 ? "+" : ""}${f.z})`;
    return rounded;
  }
  return String(f.value);
}
