"use client";

import { motion } from "framer-motion";
import { effects } from "@/lib/manuscript-data";

/**
 * Table 2 — univariate effect sizes (Cohen's d / Cramér's V) with
 * magnitude bars. Drives home which features actually separate the groups.
 */
export function EffectSizes() {
  const allValues = [
    ...effects.continuous.map((r) => r.cohensD),
    ...effects.categorical.map((r) => r.cramersV),
  ];
  const maxAbs = Math.max(...allValues, 1);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-3 text-sm font-medium">
          Continuous variables — Cohen's d
        </h3>
        <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
          {effects.continuous.map((r, i) => (
            <Bar
              key={r.variable}
              label={r.variable}
              right={`${r.meanGe13} vs ${r.meanLt13}`}
              value={r.cohensD}
              max={maxAbs}
              tag={r.interpretation}
              delay={i * 0.05}
            />
          ))}
          <Legend
            items={[
              { color: "bg-primary/80", label: "small 0.2" },
              { color: "bg-accent/80", label: "medium 0.5" },
              { color: "bg-destructive/80", label: "large 0.8" },
            ]}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">
          Categorical variables — Cramér's V
        </h3>
        <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
          {effects.categorical.map((r, i) => (
            <Bar
              key={r.variable}
              label={r.variable}
              right={`p = ${r.p}`}
              value={r.cramersV}
              max={maxAbs}
              tag={r.interpretation}
              delay={i * 0.05}
            />
          ))}
          <Legend
            items={[
              { color: "bg-primary/80", label: "small 0.1" },
              { color: "bg-accent/80", label: "medium 0.3" },
              { color: "bg-destructive/80", label: "large 0.5" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function Bar({
  label,
  right,
  value,
  max,
  tag,
  delay,
}: {
  label: string;
  right: string;
  value: number;
  max: number;
  tag: string;
  delay: number;
}) {
  const width = Math.min((value / max) * 100, 100);
  const color =
    value >= 0.5
      ? "from-accent to-destructive"
      : value >= 0.2
        ? "from-primary to-accent"
        : "from-muted-foreground/50 to-primary";
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-foreground/90">{label}</span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {right}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
            className={`h-full rounded-full bg-gradient-to-r ${color}`}
          />
        </div>
        <span className="w-14 text-right font-mono text-[11px] tabular-nums text-foreground">
          {value.toFixed(3)}
        </span>
        <span className="w-20 text-right text-[10px] text-muted-foreground">
          {tag}
        </span>
      </div>
    </div>
  );
}

function Legend({
  items,
}: {
  items: { color: string; label: string }[];
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-1.5 w-3 rounded-full ${i.color}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
