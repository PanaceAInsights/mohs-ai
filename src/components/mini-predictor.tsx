"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { predict } from "@/lib/model";
import { DEFAULT_PATIENT } from "@/lib/model-types";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

/**
 * Tiny live demo: adjust tumour X/Y, watch the probability of ≥13 sections
 * update instantly. Runs the shipping Logistic Regression entirely in the
 * browser — no network call. Used on the landing page and anywhere else we
 * want to make "this actually works" obvious.
 */
export function MiniPredictor() {
  const [sizeX, setSizeX] = useState(15);
  const [sizeY, setSizeY] = useState(12);
  const [aggressive, setAggressive] = useState<"0" | "1">("0");
  const [recurrent, setRecurrent] = useState<"0" | "1">("0");

  const result = useMemo(() => {
    return predict({
      ...DEFAULT_PATIENT,
      Tumour_Size_X: sizeX,
      Tumour_Size_Y: sizeY,
      Aggressive_Histopathology: aggressive,
      Recurrent: recurrent,
    });
  }, [sizeX, sizeY, aggressive, recurrent]);

  const pct = result.probability * 100;
  const complex = result.probability >= 0.5;
  const areaPct = Math.min((result.tumourAreaCm2 / 6) * 100, 100);
  const thresholdPct = Math.min((1.5 / 6) * 100, 100);

  return (
    <div className="relative w-full max-w-md rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
      <div className="flex items-center justify-between pb-4">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Live demo · runs in your browser
        </span>
        <Badge
          variant="secondary"
          className="font-mono text-[10px] tracking-wide"
        >
          {complex ? "≥13 likely" : "<13 likely"}
        </Badge>
      </div>

      {/* Probability gauge */}
      <div className="pb-5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            P(≥13 sections)
          </span>
          <motion.span
            key={result.probability}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`font-mono text-4xl font-semibold tabular-nums ${complex ? "text-destructive" : "text-primary"}`}
          >
            {pct.toFixed(1)}
            <span className="text-xl">%</span>
          </motion.span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className={`h-full rounded-full ${complex ? "bg-destructive" : "bg-primary"}`}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
        </div>
        <div className="pt-1 text-[11px] text-muted-foreground">
          Confidence: <span className="text-foreground">{result.confidence}</span>
          {result.exceedsThreshold && (
            <span className="ml-2 text-accent">· exceeds 1.5 cm² threshold</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <ControlRow
          label="Tumour width (mm)"
          value={sizeX}
          min={2}
          max={60}
          step={1}
          onChange={setSizeX}
        />
        <ControlRow
          label="Tumour height (mm)"
          value={sizeY}
          min={2}
          max={60}
          step={1}
          onChange={setSizeY}
        />
        <div className="flex gap-2">
          <Toggle
            label="Recurrent"
            on={recurrent === "1"}
            onClick={() => setRecurrent(recurrent === "1" ? "0" : "1")}
          />
          <Toggle
            label="Aggressive histo"
            on={aggressive === "1"}
            onClick={() => setAggressive(aggressive === "1" ? "0" : "1")}
          />
        </div>
      </div>

      {/* Area indicator */}
      <div className="mt-5 border-t border-border/60 pt-4">
        <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
          <span>Tumour area (ellipse)</span>
          <span className="font-mono tabular-nums text-foreground">
            {result.tumourAreaCm2.toFixed(2)} cm²
          </span>
        </div>
        <div className="relative mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-destructive"
            initial={false}
            animate={{ width: `${areaPct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
          {/* 1.5 cm² threshold marker */}
          <div
            aria-hidden
            className="absolute inset-y-0 w-px bg-foreground/50"
            style={{ left: `${thresholdPct}%` }}
          />
        </div>
        <p className="pt-1 text-[10px] text-muted-foreground">
          Marker at 1.5 cm² — the manuscript's SHAP-derived clinical threshold.
        </p>
      </div>
    </div>
  );
}

function ControlRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono tabular-nums text-foreground">{value}</span>
      </div>
      <Slider
        className="mt-1.5"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] ?? value : v)}
      />
    </label>
  );
}

function Toggle({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex-1 rounded-lg border px-3 py-2 text-xs transition ${
        on
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
      }`}
    >
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            on ? "bg-primary" : "bg-muted-foreground/40"
          }`}
        />
      </span>
    </button>
  );
}
