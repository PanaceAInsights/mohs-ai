"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import casesData from "../../../public/data/cases.json" with { type: "json" };
import { computeEllipseArea, predict } from "@/lib/model";
import { DEFAULT_PATIENT, type PatientInput } from "@/lib/model-types";
import { cn } from "@/lib/utils";

type Case = {
  zone: "H" | "M" | "L";
  area: number;
  sizeX: number;
  sizeY: number;
  sections: number;
  stages: number;
  type: string;
  recurrent: boolean;
  aggressive: boolean;
  unit: string;
  age: number;
  sex: "M" | "F";
};

const ZONE_NAMES: Record<"H" | "M" | "L", "1" | "2" | "3"> = {
  H: "1",
  M: "2",
  L: "3",
};

export function CaseSimilarity() {
  const [age, setAge] = useState(68);
  const [sizeX, setSizeX] = useState(14);
  const [sizeY, setSizeY] = useState(10);
  const [type, setType] = useState<"BCC" | "SCC">("BCC");
  const [zone, setZone] = useState<"H" | "M" | "L">("H");
  const [recurrent, setRecurrent] = useState(false);
  const [aggressive, setAggressive] = useState(false);

  // Encode the query and predict
  const query: PatientInput = {
    ...DEFAULT_PATIENT,
    Age: age,
    Tumour_Size_X: sizeX,
    Tumour_Size_Y: sizeY,
    Tumour_Stats: (type === "BCC" ? "1" : "2") as PatientInput["Tumour_Stats"],
    Body_Zone: ZONE_NAMES[zone],
    Recurrent: recurrent ? "1" : "0",
    Aggressive_Histopathology: aggressive ? "1" : "0",
  };
  const queryArea = computeEllipseArea(sizeX, sizeY);
  const prediction = predict(query);

  // k-NN — standardized distance over numeric features + categorical match bonuses
  const cases = casesData as Case[];
  const neighbours = useMemo(() => {
    // Rough standardization using cohort mean/SD approximations
    const std = { area: 6.0, age: 13.0, sections: 8.0 };
    const typeCode = type;
    const withDist = cases.map((c) => {
      const dA = (c.area - queryArea) / std.area;
      const dAge = (c.age - age) / std.age;
      let dCat = 0;
      if (c.zone !== zone) dCat += 0.7;
      if (c.type !== typeCode) dCat += 0.7;
      if (c.recurrent !== recurrent) dCat += 0.5;
      if (c.aggressive !== aggressive) dCat += 0.4;
      const dist = Math.sqrt(dA * dA + dAge * dAge) + dCat;
      return { ...c, dist };
    });
    withDist.sort((a, b) => a.dist - b.dist);
    return withDist.slice(0, 6);
  }, [cases, queryArea, age, type, zone, recurrent, aggressive]);

  const avgSections =
    neighbours.reduce((s, n) => s + n.sections, 0) / neighbours.length;
  const pctGe13 =
    (neighbours.filter((n) => n.sections >= 13).length / neighbours.length) *
    100;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Your patient
          </p>
          <div className="mt-3 space-y-3">
            <SliderField
              label="Age"
              value={age}
              min={25}
              max={95}
              onChange={setAge}
            />
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
            <div className="flex flex-wrap gap-1">
              <ChoiceChip active={type === "BCC"} onClick={() => setType("BCC")}>
                BCC
              </ChoiceChip>
              <ChoiceChip active={type === "SCC"} onClick={() => setType("SCC")}>
                SCC
              </ChoiceChip>
              <ChoiceChip
                active={recurrent}
                onClick={() => setRecurrent((v) => !v)}
              >
                Recurrent
              </ChoiceChip>
              <ChoiceChip
                active={aggressive}
                onClick={() => setAggressive((v) => !v)}
              >
                Aggressive
              </ChoiceChip>
            </div>
            <div className="flex gap-1">
              {(["H", "M", "L"] as const).map((z) => (
                <ChoiceChip
                  key={z}
                  active={zone === z}
                  onClick={() => setZone(z)}
                >
                  {z}-zone
                </ChoiceChip>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Closest historical cases
          </p>
          <div className="grid grid-cols-2 gap-3">
            <OutcomeStat
              label="Mean sections (k=6)"
              value={avgSections.toFixed(1)}
              tone="primary"
            />
            <OutcomeStat
              label="% with ≥13 sections"
              value={`${pctGe13.toFixed(0)}%`}
              tone="accent"
            />
          </div>
          <OutcomeStat
            label="Model probability (LR)"
            value={`${(prediction.probability * 100).toFixed(1)}%`}
            sub={`confidence: ${prediction.confidence}`}
            tone="destructive"
          />
          <p className="text-[11px] text-muted-foreground">
            The k-NN average (left) is what actually happened in the 6 most
            similar historical cases. The model probability (right) is what the
            classifier predicts for a patient like yours. Large gaps suggest
            borderline cases.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40">
        <div className="border-b border-border/40 px-4 py-3">
          <p className="text-sm font-medium">Top 6 similar cases</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Demographics</th>
              <th className="px-4 py-2 font-medium">Tumour</th>
              <th className="px-4 py-2 font-medium">Unit · zone</th>
              <th className="px-4 py-2 text-right font-medium">Sections</th>
              <th className="px-4 py-2 text-right font-medium">Stages</th>
              <th className="px-4 py-2 text-right font-medium">Δ similarity</th>
            </tr>
          </thead>
          <tbody>
            {neighbours.map((n, i) => (
              <motion.tr
                key={i}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-border/30 last:border-b-0"
              >
                <td className="px-4 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                  {i + 1}
                </td>
                <td className="px-4 py-2 font-mono text-xs tabular-nums">
                  {n.age}yo {n.sex}
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex flex-wrap items-center gap-1">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {n.type}
                    </span>
                    {n.recurrent && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] text-destructive">
                        recurrent
                      </span>
                    )}
                    {n.aggressive && (
                      <span className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                        aggressive
                      </span>
                    )}
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {n.sizeX}×{n.sizeY} mm · {n.area.toFixed(2)} cm²
                    </span>
                  </span>
                </td>
                <td className="px-4 py-2 font-mono text-xs">
                  {n.unit} · {n.zone}-zone
                </td>
                <td
                  className={cn(
                    "px-4 py-2 text-right font-mono tabular-nums",
                    n.sections >= 13 ? "text-destructive" : "text-foreground/80",
                  )}
                >
                  {n.sections}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground/80">
                  {n.stages}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">
                  {n.dist.toFixed(2)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
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

function ChoiceChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs transition",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function OutcomeStat({
  label,
  value,
  sub,
  tone = "foreground",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "foreground" | "primary" | "accent" | "destructive";
}) {
  const colorMap = {
    foreground: "text-foreground",
    primary: "text-primary",
    accent: "text-accent",
    destructive: "text-destructive",
  };
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <motion.p
        key={value}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("mt-1 font-mono text-2xl tabular-nums", colorMap[tone])}
      >
        {value}
      </motion.p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
