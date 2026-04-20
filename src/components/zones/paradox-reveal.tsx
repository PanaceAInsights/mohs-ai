"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import zonesData from "../../../public/data/zones.json" with { type: "json" };
import { cn } from "@/lib/utils";

type Zone = "H" | "M" | "L";
type Metric = "sections" | "area";

const METRICS: Record<Metric, { label: string; suffix: string; max: number; accessor: (d: (typeof zonesData)[Zone]) => number }> = {
  sections: {
    label: "Mean sections required",
    suffix: "",
    max: 18,
    accessor: (d) => d.meanSections,
  },
  area: {
    label: "Mean tumour area",
    suffix: " cm²",
    max: 14,
    accessor: (d) => d.meanAreaCm2,
  },
};

const ZONE_COLOR: Record<Zone, string> = {
  H: "bg-primary",
  M: "bg-accent",
  L: "bg-destructive",
};

/**
 * Toggle between "mean sections" and "mean tumour area" by zone.
 *
 * Clinical intuition expects H-zone (high-risk) to have the MOST sections —
 * but the bars flip when you switch to tumour area, revealing the paradox:
 * L-zone tumours in this cohort are ~6× larger than H-zone.
 */
export function ParadoxReveal() {
  const [metric, setMetric] = useState<Metric>("sections");
  const m = METRICS[metric];
  const zones: Zone[] = ["H", "M", "L"];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-medium">Zones compared by…</h3>
          <p className="text-xs text-muted-foreground">
            Toggle between these two metrics to see the paradox unfold.
          </p>
        </div>
        <div className="flex gap-1">
          {(Object.keys(METRICS) as Metric[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setMetric(k)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs transition",
                k === metric
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground",
              )}
            >
              {METRICS[k].label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {zones.map((z) => {
          const v = m.accessor(zonesData[z]);
          const pct = (v / m.max) * 100;
          return (
            <div key={`${metric}-${z}`}>
              <div className="flex items-baseline justify-between pb-1">
                <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/90">
                  {z}-zone · {zonesData[z].n} cases
                </span>
                <motion.span
                  key={`${metric}-${z}-label`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-mono text-sm tabular-nums"
                >
                  {v.toFixed(metric === "area" ? 2 : 1)}
                  {m.suffix}
                </motion.span>
              </div>
              <div className="h-6 overflow-hidden rounded-md bg-muted">
                <motion.div
                  key={`${metric}-${z}-bar`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className={cn("h-full rounded-md", ZONE_COLOR[z])}
                />
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={metric}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="mt-5 rounded-lg border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground"
        >
          {metric === "sections" ? (
            <p>
              Counterintuitive reading: L-zone (lowest anatomical risk)
              requires the <span className="text-foreground">most sections</span>.
              H-zone (highest risk) is lowest.
            </p>
          ) : (
            <p>
              The reason revealed: L-zone tumours in this cohort are{" "}
              <span className="text-foreground">~6× larger</span> than H-zone
              tumours. Sections scale with size, not anatomical-risk label.
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
