"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import defectModel from "../../../public/data/defect_model.json" with { type: "json" };
import casesData from "../../../public/data/cases.json" with { type: "json" };
import { computeEllipseArea } from "@/lib/model";

type Case = { area: number; defectArea: number | null; stages: number };

export function DefectEstimator() {
  const [sizeX, setSizeX] = useState(15);
  const [sizeY, setSizeY] = useState(12);
  const [stages, setStages] = useState(3);

  const tumourArea = useMemo(() => computeEllipseArea(sizeX, sizeY), [sizeX, sizeY]);
  const predictedDefect =
    defectModel.intercept +
    defectModel.coef_tumour_area * tumourArea +
    defectModel.coef_stages * stages;
  const lower = Math.max(0, predictedDefect - defectModel.metrics.mae);
  const upper = predictedDefect + defectModel.metrics.mae;

  const cases = (casesData as Case[]).filter(
    (c) => c.defectArea != null && c.area > 0,
  );

  // Scatter geometry
  const W = 680;
  const H = 340;
  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const xMin = 0.05;
  const xMax = 50;
  const yMin = 0;
  const yMax = 100;
  const xScale = (v: number) =>
    pad.left + (Math.log10(Math.max(v, xMin)) - Math.log10(xMin)) /
      (Math.log10(xMax) - Math.log10(xMin)) * innerW;
  const yScale = (v: number) => pad.top + innerH - (v / yMax) * innerH;

  // Regression line — sweep area at fixed stages
  const lineSweep = Array.from({ length: 60 }, (_, i) => {
    const a = Math.pow(10, Math.log10(xMin) + (i / 59) * (Math.log10(xMax) - Math.log10(xMin)));
    const d =
      defectModel.intercept +
      defectModel.coef_tumour_area * a +
      defectModel.coef_stages * stages;
    return { area: a, defect: Math.max(0, d) };
  });
  const pathD = lineSweep
    .map((p, i) =>
      `${i === 0 ? "M" : "L"} ${xScale(p.area).toFixed(1)} ${yScale(Math.min(p.defect, yMax)).toFixed(1)}`,
    )
    .join(" ");

  const xTicks = [0.1, 0.5, 1, 5, 10, 30];
  const yTicks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Tumour dimensions
          </p>

          <div className="mt-4 space-y-3">
            <SliderField
              label="Size X (mm)"
              value={sizeX}
              min={2}
              max={60}
              onChange={setSizeX}
            />
            <SliderField
              label="Size Y (mm)"
              value={sizeY}
              min={2}
              max={60}
              onChange={setSizeY}
            />
            <SliderField
              label="Predicted stages"
              value={stages}
              min={1}
              max={6}
              onChange={setStages}
            />
          </div>

          <div className="mt-5 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs">
            <p className="font-mono text-muted-foreground">
              defect(cm²) = {defectModel.intercept.toFixed(2)} +{" "}
              {defectModel.coef_tumour_area.toFixed(2)} · area +{" "}
              {defectModel.coef_stages.toFixed(2)} · stages
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Linear regression · R² ={" "}
              <span className="font-mono tabular-nums text-foreground">
                {defectModel.metrics.r2.toFixed(3)}
              </span>
              , MAE ={" "}
              <span className="font-mono tabular-nums text-foreground">
                {defectModel.metrics.mae.toFixed(1)} cm²
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Predicted defect area
          </p>
          <motion.p
            key={Math.round(predictedDefect * 10)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-5xl tabular-nums text-primary"
          >
            {Math.max(0, predictedDefect).toFixed(1)}
            <span className="text-2xl text-muted-foreground"> cm²</span>
          </motion.p>
          <p className="text-xs text-muted-foreground">
            ±1 MAE band: {lower.toFixed(1)} – {upper.toFixed(1)} cm²
          </p>
          <div className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
            <Mini label="Tumour area" value={`${tumourArea.toFixed(2)} cm²`} />
            <Mini
              label="Defect:tumour ratio"
              value={`${(predictedDefect / Math.max(tumourArea, 0.1)).toFixed(1)}×`}
            />
            <Mini
              label="Est. margin growth"
              value={`${Math.max(0, predictedDefect - tumourArea).toFixed(1)} cm²`}
            />
          </div>
          <p className="mt-3 border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
            Use as a planning aid only — defect morphology depends on surgical
            margins, closure technique, and intraoperative findings.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-4">
        <p className="mb-2 text-sm font-medium">Tumour vs defect area</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line
                x1={pad.left}
                x2={W - pad.right}
                y1={yScale(t)}
                y2={yScale(t)}
                stroke="currentColor"
                className="text-border"
                opacity={0.3}
              />
              <text
                x={pad.left - 8}
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
                y={H - pad.bottom + 16}
                textAnchor="middle"
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {t}
              </text>
            </g>
          ))}
          {/* scatter */}
          {cases.map((c, i) => (
            <circle
              key={i}
              cx={xScale(c.area)}
              cy={yScale(Math.min(c.defectArea ?? 0, yMax))}
              r={3}
              className="fill-muted-foreground"
              opacity={0.4}
            />
          ))}
          {/* regression line */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-primary"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6 }}
          />
          {/* current prediction marker */}
          <circle
            cx={xScale(tumourArea)}
            cy={yScale(Math.min(predictedDefect, yMax))}
            r={7}
            className="fill-accent"
          />
          <text
            x={xScale(tumourArea) + 10}
            y={yScale(Math.min(predictedDefect, yMax)) + 4}
            className="fill-accent font-mono text-[10px]"
          >
            your patient
          </text>
          {/* axes labels */}
          <text
            x={W / 2}
            y={H - 4}
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
            Defect area (cm²)
          </text>
        </svg>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-sm tabular-nums text-foreground">
          {value}
        </span>
      </div>
      <Slider
        className="mt-1"
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] ?? value : v)}
      />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-mono tabular-nums text-foreground">{value}</p>
    </div>
  );
}
