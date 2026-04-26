"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Prediction } from "@/lib/model";

const COLORS: Record<string, { bar: string; text: string }> = {
  LR: { bar: "bg-primary", text: "text-primary" },
  HGB: { bar: "bg-accent", text: "text-accent" },
  MLP: { bar: "bg-chart-4", text: "text-chart-4" },
};

/**
 * Shows how each ensemble member sees the current patient.
 * Three bars side-by-side + the soft-vote average.
 * Spread between models is the honest signal of disagreement.
 */
export function EnsembleBreakdown({ prediction }: { prediction: Prediction }) {
  const ensemble = prediction.probability;
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-5">
      <div className="flex items-baseline justify-between pb-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Ensemble breakdown
        </span>
        <span
          className={cn(
            "font-mono text-[10px] tabular-nums uppercase tracking-widest",
            prediction.confidence === "high"
              ? "text-accent"
              : prediction.confidence === "split"
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        >
          {prediction.confidence === "split"
            ? `models disagree · spread ${(prediction.spread * 100).toFixed(0)}%`
            : `spread ${(prediction.spread * 100).toFixed(0)}%`}
        </span>
      </div>

      <div className="space-y-3">
        {prediction.perModel.map((m) => {
          const color = COLORS[m.name] ?? { bar: "bg-muted", text: "text-foreground" };
          const pct = m.probability * 100;
          const ensemblePct = ensemble * 100;
          return (
            <div key={m.name}>
              <div className="flex items-baseline justify-between pb-1">
                <span className="text-xs">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {m.name}
                  </span>{" "}
                  <span className="text-foreground/80">{m.label}</span>
                </span>
                <span className={cn("font-mono text-sm tabular-nums", color.text)}>
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 130, damping: 22 }}
                  className={cn("h-full rounded-full", color.bar)}
                />
                <div
                  aria-hidden
                  className="absolute inset-y-0 w-px bg-foreground/40"
                  style={{ left: `${ensemblePct}%` }}
                  title="Soft-vote ensemble average"
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>{m.category}</span>
                <span>
                  CV-AUC{" "}
                  <span className="font-mono tabular-nums">
                    {m.metrics.cv_auc_mean?.toFixed(3) ?? "—"}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs">
        <span className="text-muted-foreground">Soft-vote ensemble</span>
        <span className="font-mono text-base tabular-nums text-foreground">
          {(ensemble * 100).toFixed(1)}%
        </span>
      </div>
      {prediction.confidence === "split" && (
        <p className="mt-2 text-[11px] text-destructive">
          Models disagree on the side of 50%. Treat as a borderline case and
          combine with clinical judgement.
        </p>
      )}
    </div>
  );
}
