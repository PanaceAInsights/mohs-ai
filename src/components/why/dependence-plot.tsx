"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { computeEllipseArea, predict } from "@/lib/model";
import { DEFAULT_PATIENT, type PatientInput } from "@/lib/model-types";
import shapData from "../../../public/data/shap.json" with { type: "json" };
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Dependence plot: shows how model output responds to tumour area.
 * - Scatter: 20 held-out test cases — tumour area vs SHAP contribution of area
 * - Overlay line: live model P(≥13) as you sweep tumour area for a chosen scenario
 * - Vertical line at 1.5 cm² — the manuscript's clinical threshold
 *
 * The interaction reveals the most important finding in the paper: the model
 * has learned a clean threshold behaviour at ~1.5 cm² of ellipse area.
 */
export function DependencePlot() {
  const [recurrent, setRecurrent] = useState<"0" | "1">("0");
  const [aggressive, setAggressive] = useState<"0" | "1">("0");
  const [tumourType, setTumourType] =
    useState<PatientInput["Tumour_Stats"]>("1");

  // Build the ghost line of P(≥13) across a log-spaced area sweep.
  // We vary only Tumour_Size_X (height held at 10 mm) so the area changes.
  const curve = useMemo(() => {
    const points: { area: number; prob: number }[] = [];
    const sizesMm = Array.from({ length: 80 }, (_, i) => 2 + i * 0.9); // 2 → 73.1 mm
    for (const x of sizesMm) {
      const y = 10;
      const area = computeEllipseArea(x, y);
      const p = predict({
        ...DEFAULT_PATIENT,
        Tumour_Size_X: x,
        Tumour_Size_Y: y,
        Recurrent: recurrent,
        Aggressive_Histopathology: aggressive,
        Tumour_Stats: tumourType,
      }).probability;
      points.push({ area, prob: p });
    }
    return points;
  }, [recurrent, aggressive, tumourType]);

  // Scatter points from real test cases
  const cases = shapData.cases
    .map((c: { features: Record<string, number | string>; shap: { feature: string; value: number }[] }) => {
      const area = Number(c.features.Tumour_Area_cm2) || 0;
      const shapEntry = c.shap.find((s) => s.feature === "Tumour_Area_cm2");
      if (!shapEntry || area <= 0) return null;
      return { area, shap: shapEntry.value };
    })
    .filter(Boolean) as { area: number; shap: number }[];

  // Dimensions — using viewBox so it stays sharp
  const W = 720;
  const H = 320;
  const pad = { top: 16, right: 16, bottom: 40, left: 48 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  // Log-x scale (area: 0.05 → 50 cm²)
  const xMin = 0.05;
  const xMax = 50;
  const xScale = (v: number) =>
    pad.left + (Math.log10(Math.max(v, xMin)) - Math.log10(xMin)) /
      (Math.log10(xMax) - Math.log10(xMin)) * innerW;

  // Two y-scales: probability (left) 0-1, SHAP (right) -0.25 → 0.25
  const yProbScale = (p: number) => pad.top + innerH - p * innerH;
  const shapAbsMax = 0.25;
  const yShapScale = (s: number) =>
    pad.top + innerH / 2 - (s / shapAbsMax) * (innerH / 2);

  const thresholdX = xScale(1.5);

  const pathD = curve
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.area).toFixed(1)} ${yProbScale(p.prob).toFixed(1)}`)
    .join(" ");

  // Grid x-ticks on log scale
  const xTicks = [0.1, 0.5, 1, 1.5, 5, 10, 30];

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Ghost curve:</span>
        <Toggle on={tumourType === "2"} onClick={() => setTumourType(tumourType === "2" ? "1" : "2")}>
          SCC
        </Toggle>
        <Toggle on={recurrent === "1"} onClick={() => setRecurrent(recurrent === "1" ? "0" : "1")}>
          Recurrent
        </Toggle>
        <Toggle on={aggressive === "1"} onClick={() => setAggressive(aggressive === "1" ? "0" : "1")}>
          Aggressive histo
        </Toggle>
        <Badge variant="secondary" className="ml-auto font-mono text-[10px]">
          n={cases.length} test cases
        </Badge>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40 p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {/* Grid */}
          <g>
            {[0, 0.25, 0.5, 0.75, 1].map((y) => (
              <line
                key={y}
                x1={pad.left}
                x2={pad.left + innerW}
                y1={yProbScale(y)}
                y2={yProbScale(y)}
                stroke="currentColor"
                className="text-border"
                strokeWidth={1}
                strokeDasharray={y === 0.5 ? "3 3" : "0"}
                opacity={y === 0.5 ? 0.6 : 0.3}
              />
            ))}
            {xTicks.map((v) => (
              <g key={v}>
                <line
                  x1={xScale(v)}
                  x2={xScale(v)}
                  y1={pad.top}
                  y2={pad.top + innerH}
                  stroke="currentColor"
                  className="text-border"
                  strokeWidth={1}
                  opacity={0.15}
                />
                <text
                  x={xScale(v)}
                  y={H - pad.bottom + 16}
                  textAnchor="middle"
                  className="fill-muted-foreground font-mono text-[10px]"
                >
                  {v}
                </text>
              </g>
            ))}
          </g>

          {/* Axes labels */}
          <text
            x={pad.left - 36}
            y={yProbScale(1)}
            className="fill-muted-foreground font-mono text-[10px]"
          >
            1.0
          </text>
          <text
            x={pad.left - 36}
            y={yProbScale(0.5)}
            className="fill-muted-foreground font-mono text-[10px]"
          >
            0.5
          </text>
          <text
            x={pad.left - 36}
            y={yProbScale(0)}
            className="fill-muted-foreground font-mono text-[10px]"
          >
            0.0
          </text>
          <text
            x={W / 2}
            y={H - 6}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            Tumour area (cm², log scale)
          </text>
          <text
            x={-H / 2}
            y={14}
            transform="rotate(-90)"
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            P(≥13 sections)  ·  SHAP
          </text>

          {/* 1.5 cm² threshold */}
          <line
            x1={thresholdX}
            x2={thresholdX}
            y1={pad.top}
            y2={pad.top + innerH}
            stroke="currentColor"
            className="text-accent"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <text
            x={thresholdX + 6}
            y={pad.top + 14}
            className="fill-accent font-mono text-[10px]"
          >
            1.5 cm² threshold
          </text>

          {/* Scatter (SHAP values of test cases) */}
          {cases.map((c, i) => (
            <motion.circle
              key={i}
              cx={xScale(c.area)}
              cy={yShapScale(c.shap)}
              r={4.5}
              className={c.shap > 0 ? "fill-destructive" : "fill-primary"}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 0.85, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.015, duration: 0.4 }}
            />
          ))}

          {/* Ghost curve (P(≥13) prediction sweep) */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            className="text-accent/80"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <LegendItem color="bg-accent" label="live P(≥13) sweep" />
        <LegendItem color="bg-destructive" label="test case · +SHAP" />
        <LegendItem color="bg-primary" label="test case · −SHAP" />
        <span className="ml-auto">
          Toggling the chips re-runs the model in your browser across the
          entire range above and re-draws the curve.
        </span>
      </div>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs transition",
        on
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
