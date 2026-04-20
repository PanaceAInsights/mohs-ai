"use client";

import { motion } from "framer-motion";
import shapData from "../../../public/data/shap.json" with { type: "json" };
import { shapImportance as paperImportance } from "@/lib/manuscript-data";

const LABELS: Record<string, string> = {
  Tumour_Area_cm2: "Tumour area (ellipse)",
  Tumour_Size_X: "Tumour width",
  Tumour_Size_Y: "Tumour height",
  Unit: "Anatomical unit",
  Recurrent: "Recurrence status",
  Aggressive: "Aggressive histopathology",
  Aggressive_Histopathology: "Aggressive histopathology",
  Age: "Patient age",
  Body: "Body zone",
  Body_Zone: "Body zone",
  Tumour_Stats: "Tumour type",
  Biopsy: "Biopsy method",
  Laterality: "Laterality",
  Sex: "Sex",
  Experience: "Surgeon experience",
  See_Do: "See-and-do",
  Smoking: "Smoking",
};

type Mode = "recomputed" | "paper";

/** Global SHAP importance bars with a toggle between recomputed and paper values. */
export function ShapImportance({ mode = "recomputed" }: { mode?: Mode }) {
  const recomputed = shapData.summary.importance;
  const paper = paperImportance;
  const rows = (mode === "paper" ? paper : recomputed).slice(0, 10).map((r) => ({
    raw: r.feature,
    label: LABELS[r.feature] ?? r.feature,
    value: r.value,
  }));
  const max = Math.max(...rows.map((r) => r.value), 0.14);

  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div
          key={r.raw}
          className="rounded-lg border border-border/60 bg-card/40 px-4 py-2.5"
        >
          <div className="flex items-baseline justify-between pb-1.5 text-xs">
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              #{i + 1}
            </span>
            <span className="truncate text-foreground/90">{r.label}</span>
            <span className="font-mono tabular-nums text-foreground">
              {r.value.toFixed(3)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(r.value / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
