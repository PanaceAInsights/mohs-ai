"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import shapData from "../../../public/data/shap.json" with { type: "json" };

const LABELS: Record<string, string> = {
  Tumour_Area_cm2: "Tumour area",
  Tumour_Size_X: "Tumour width",
  Tumour_Size_Y: "Tumour height",
  Unit: "Anatomical unit",
  Recurrent: "Recurrence status",
  Aggressive: "Aggressive histo",
  Aggressive_Histopathology: "Aggressive histo",
  Age: "Patient age",
  Body: "Body zone",
  Body_Zone: "Body zone",
  Tumour_Stats: "Tumour type",
  Biopsy: "Previous treatment method",
  Laterality: "Laterality",
  Sex: "Sex",
  Experience: "Surgeon experience",
  See_Do: "See-and-do",
  Smoking: "Smoking",
};

type Case = {
  features: Record<string, number | string>;
  shap: { feature: string; value: number }[];
};

export function Waterfall() {
  const cases = shapData.cases as Case[];
  const [idx, setIdx] = useState(0);
  const current = cases[idx];

  const baseline = shapData.summary.baseline as number;
  // Running sum: baseline + each contribution
  const steps = useMemo(() => {
    let running = baseline;
    return current.shap.map((s) => {
      const start = running;
      running = Math.min(Math.max(running + s.value, 0), 1);
      return { ...s, start, end: running };
    });
  }, [current, baseline]);

  const final = steps[steps.length - 1]?.end ?? baseline;
  const area = Number(current.features.Tumour_Area_cm2) || 0;
  const size = `${current.features.Tumour_Size_X}×${current.features.Tumour_Size_Y} mm`;
  const complex = final >= 0.5;

  return (
    <div className="space-y-4">
      {/* Case picker */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Test case</span>
        <div className="flex flex-wrap gap-1">
          {cases.slice(0, 20).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className={`h-6 w-8 rounded-md border font-mono text-[10px] tabular-nums transition ${
                idx === i
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-border/80"
              }`}
            >
              #{i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Case context */}
      <div className="grid gap-2 rounded-xl border border-border/60 bg-card/40 p-4 text-sm sm:grid-cols-4">
        <CaseField label="Age" value={`${current.features.Age}`} />
        <CaseField
          label="Type"
          value={
            current.features.Tumour_Stats === "1" || current.features.Tumour_Stats === 1
              ? "BCC"
              : current.features.Tumour_Stats === "2" || current.features.Tumour_Stats === 2
                ? "SCC"
                : "Other"
          }
        />
        <CaseField label="Size" value={size} />
        <CaseField
          label="Unit"
          value={String(current.features.Unit)}
        />
      </div>

      {/* Waterfall */}
      <div className="rounded-xl border border-border/60 bg-card/40 p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Baseline (cohort prior)
            </p>
            <p className="font-mono text-2xl tabular-nums text-muted-foreground">
              {(baseline * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Final prediction
            </p>
            <p
              className={`font-mono text-2xl tabular-nums ${complex ? "text-destructive" : "text-primary"}`}
            >
              {(final * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {steps.map((s, i) => {
            const up = s.value > 0;
            const low = Math.min(s.start, s.end) * 100;
            const widthPct = Math.abs(s.end - s.start) * 100;
            const area = Number(current.features[s.feature]);
            const label = LABELS[s.feature] ?? s.feature;
            return (
              <div key={s.feature}>
                <div className="flex items-baseline justify-between pb-1 text-[11px]">
                  <span className="text-foreground/90">{label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {Number.isFinite(area)
                      ? (Number.isInteger(area) ? area : area.toFixed(2))
                      : String(current.features[s.feature] ?? "")}
                    <span
                      className={`ml-2 ${up ? "text-destructive" : "text-primary"}`}
                    >
                      {up ? "+" : ""}
                      {s.value.toFixed(3)}
                    </span>
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    key={`${idx}-${i}`}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.1 + i * 0.05, duration: 0.5 }}
                    style={{
                      left: `${low}%`,
                      width: `${widthPct}%`,
                      transformOrigin: up ? "left" : "right",
                    }}
                    className={`absolute top-0 h-full rounded-full ${up ? "bg-destructive/80" : "bg-primary/80"}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-destructive/80" />
            pushes toward ≥13
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-primary/80" />
            pushes toward &lt;13
          </span>
          <span className="ml-auto">
            Top {current.shap.length} contributions · baseline is the cohort's
            base rate of ≥13 sections ({(baseline * 100).toFixed(1)}%).
          </span>
        </div>
      </div>
    </div>
  );
}

function CaseField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-sm tabular-nums text-foreground">{value}</p>
    </div>
  );
}
