"use client";

import { motion } from "framer-motion";
import zonesData from "../../../public/data/zones.json" with { type: "json" };
import { cn } from "@/lib/utils";

type Zone = "H" | "M" | "L";

const ZONE_META: Record<Zone, {
  name: string;
  color: string;
  border: string;
  bg: string;
  sites: string;
  description: string;
}> = {
  H: {
    name: "H-zone · high-risk",
    color: "text-primary",
    border: "border-primary/40",
    bg: "bg-primary/5",
    sites: "nose · ear · eye · lip · temple",
    description:
      "Anatomically high-risk for recurrence. Cosmetically sensitive; surgeons tend to take smaller, more conservative stages.",
  },
  M: {
    name: "M-zone · medium",
    color: "text-accent",
    border: "border-accent/40",
    bg: "bg-accent/5",
    sites: "forehead · cheek · scalp",
    description: "Intermediate anatomical risk.",
  },
  L: {
    name: "L-zone · low-risk",
    color: "text-destructive",
    border: "border-destructive/40",
    bg: "bg-destructive/5",
    sites: "neck · hand · trunk · pretibial",
    description:
      "Anatomically low-risk — but L-zone tumours in this cohort are ~6× larger than H-zone tumours and require many more sections.",
  },
};

export function ZoneCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {(Object.keys(zonesData) as Zone[]).map((z, i) => {
        const m = ZONE_META[z];
        const d = zonesData[z];
        return (
          <motion.div
            key={z}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "rounded-xl border bg-card/40 p-5 backdrop-blur",
              m.border,
            )}
          >
            <div className="flex items-baseline justify-between">
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-widest",
                  m.color,
                )}
              >
                {m.name}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                n={d.n}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {m.sites}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <Metric
                color={m.color}
                label="Mean sections"
                value={d.meanSections.toFixed(1)}
              />
              <Metric
                color={m.color}
                label="Mean area (cm²)"
                value={d.meanAreaCm2.toFixed(2)}
              />
              <Metric
                color={m.color}
                label="% ≥ 13 sections"
                value={`${d.pctGe13.toFixed(0)}%`}
              />
              <Metric
                color={m.color}
                label="Sections / stage"
                value={d.sectionsPerStage.toFixed(1)}
              />
            </div>

            <p className="mt-4 border-t border-border/40 pt-3 text-[12px] leading-relaxed text-muted-foreground">
              {m.description}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

function Metric({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={cn("font-mono text-2xl tabular-nums", color)}>{value}</p>
    </div>
  );
}
