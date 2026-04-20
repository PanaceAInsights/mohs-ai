"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import casesData from "../../../public/data/cases.json" with { type: "json" };
import { cn } from "@/lib/utils";

type Case = {
  zone: "H" | "M" | "L";
  area: number;
  sections: number;
  stages: number;
  type: string;
  recurrent: boolean;
  aggressive: boolean;
  unit: string;
  age: number;
};

const ZONE_COLORS: Record<"H" | "M" | "L", string> = {
  H: "fill-primary",
  M: "fill-accent",
  L: "fill-destructive",
};

const ZONE_STROKE: Record<"H" | "M" | "L", string> = {
  H: "stroke-primary/60",
  M: "stroke-accent/60",
  L: "stroke-destructive/60",
};

/**
 * Per-case scatter: log-x tumour area vs sections count, coloured by zone.
 * Filter chips let the reader isolate zones. 13-section outcome line makes
 * the ≥13 cut-off visible.
 */
export function ParadoxScatter() {
  const cases = casesData as Case[];
  const [zones, setZones] = useState<Set<"H" | "M" | "L">>(
    () => new Set(["H", "M", "L"]),
  );

  const filtered = useMemo(
    () => cases.filter((c) => zones.has(c.zone) && c.area > 0),
    [cases, zones],
  );

  // Chart geometry
  const W = 760;
  const H = 420;
  const pad = { top: 24, right: 20, bottom: 48, left: 56 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const xMin = 0.05;
  const xMax = 40;
  const yMin = 0;
  const yMax = 42;

  const xScale = (v: number) =>
    pad.left + (Math.log10(Math.max(v, xMin)) - Math.log10(xMin)) /
      (Math.log10(xMax) - Math.log10(xMin)) * innerW;
  const yScale = (v: number) =>
    pad.top + innerH - (v / yMax) * innerH;

  const xTicks = [0.1, 0.5, 1, 1.5, 5, 10, 30];
  const yTicks = [0, 5, 13, 20, 30, 40];

  const toggleZone = (z: "H" | "M" | "L") =>
    setZones((prev) => {
      const next = new Set(prev);
      if (next.has(z)) next.delete(z);
      else next.add(z);
      if (next.size === 0) return new Set(["H", "M", "L"]);
      return next;
    });

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-medium">Every case — area vs sections</h3>
          <p className="text-xs text-muted-foreground">
            Each dot is one of {cases.length} procedures. Toggle zones to
            isolate. The 13-section horizontal line is the ≥13 outcome cut-off.
          </p>
        </div>
        <div className="flex gap-1">
          {(["H", "M", "L"] as const).map((z) => {
            const active = zones.has(z);
            const count = cases.filter((c) => c.zone === z).length;
            return (
              <button
                key={z}
                type="button"
                onClick={() => toggleZone(z)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition",
                  active
                    ? "border-border/80 bg-card text-foreground"
                    : "border-border bg-background text-muted-foreground opacity-50",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    z === "H"
                      ? "bg-primary"
                      : z === "M"
                        ? "bg-accent"
                        : "bg-destructive",
                  )}
                />
                {z}-zone
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* grid lines */}
        <g>
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line
                x1={pad.left}
                x2={W - pad.right}
                y1={yScale(t)}
                y2={yScale(t)}
                stroke="currentColor"
                className={
                  t === 13 ? "text-accent/50" : "text-border"
                }
                strokeDasharray={t === 13 ? "5 4" : "0"}
                opacity={t === 13 ? 0.9 : 0.3}
                strokeWidth={t === 13 ? 1.5 : 1}
              />
              <text
                x={pad.left - 10}
                y={yScale(t) + 4}
                textAnchor="end"
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {t}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line
                x1={xScale(t)}
                x2={xScale(t)}
                y1={pad.top}
                y2={H - pad.bottom}
                stroke="currentColor"
                className="text-border"
                opacity={0.15}
              />
              <text
                x={xScale(t)}
                y={H - pad.bottom + 18}
                textAnchor="middle"
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {t}
              </text>
            </g>
          ))}
        </g>

        {/* 13-section threshold label */}
        <text
          x={W - pad.right - 4}
          y={yScale(13) - 4}
          textAnchor="end"
          className="fill-accent font-mono text-[10px]"
        >
          13 sections · outcome cut-off
        </text>

        {/* axes labels */}
        <text
          x={(W) / 2}
          y={H - 8}
          textAnchor="middle"
          className="fill-muted-foreground text-[11px]"
        >
          Tumour area (cm², log scale)
        </text>
        <text
          x={-H / 2}
          y={16}
          transform="rotate(-90)"
          textAnchor="middle"
          className="fill-muted-foreground text-[11px]"
        >
          Sections
        </text>

        {/* points */}
        {filtered.map((c, i) => (
          <motion.circle
            key={`${c.zone}-${i}`}
            cx={xScale(c.area)}
            cy={yScale(Math.min(c.sections, yMax))}
            r={3.5}
            className={cn(ZONE_COLORS[c.zone], ZONE_STROKE[c.zone])}
            strokeWidth={0.5}
            fillOpacity={0.7}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, delay: Math.min(i * 0.002, 0.5) }}
          />
        ))}
      </svg>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Notice how the L-zone cluster (coral) lives in the upper-right —
        large tumours, many sections. H-zone (teal) is spread left and low.
      </p>
    </div>
  );
}
