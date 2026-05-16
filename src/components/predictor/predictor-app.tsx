"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { track } from "@vercel/analytics";
import { DEFAULT_PATIENT, type PatientInput } from "@/lib/model-types";
import { predict } from "@/lib/model";
import { PatientForm } from "./patient-form";
import { ResultPanel } from "./result-panel";

const PRESETS: { key: string; label: string; patch: Partial<PatientInput> }[] = [
  {
    key: "small-nose",
    label: "Small primary BCC, nose",
    patch: {
      Age: 62,
      Sex: "1",
      Recurrent: "0",
      Tumour_Stats: "1",
      Unit: "NOSE",
      Body_Zone: "1",
      Tumour_Size_X: 8,
      Tumour_Size_Y: 6,
      Aggressive_Histopathology: "0",
    },
  },
  {
    key: "large-recurrent",
    label: "Large recurrent BCC, cheek",
    patch: {
      Age: 78,
      Sex: "1",
      Recurrent: "1",
      Tumour_Stats: "1",
      Unit: "CHEEK",
      Body_Zone: "2",
      Tumour_Size_X: 35,
      Tumour_Size_Y: 28,
      Aggressive_Histopathology: "1",
    },
  },
  {
    key: "aggressive-ear",
    label: "Aggressive BCC, ear",
    patch: {
      Age: 71,
      Sex: "0",
      Recurrent: "0",
      Tumour_Stats: "1",
      Unit: "EAR",
      Body_Zone: "1",
      Tumour_Size_X: 18,
      Tumour_Size_Y: 14,
      Aggressive_Histopathology: "1",
    },
  },
];

export function PredictorApp() {
  const [input, setInput] = useState<PatientInput>(DEFAULT_PATIENT);
  const prediction = useMemo(() => predict(input), [input]);

  const update = (patch: Partial<PatientInput>) =>
    setInput((prev) => ({ ...prev, ...patch }));

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      {/* Form column */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Patient input</h2>
            <p className="text-xs text-muted-foreground">
              All 12 pre-operative variables. Prediction updates instantly.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setInput({ ...DEFAULT_PATIENT, ...p.patch });
                  track("predictor_preset", { preset: p.key });
                }}
                className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <Sparkles className="mr-1 inline h-3 w-3" />
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setInput(DEFAULT_PATIENT)}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition hover:border-border/80 hover:text-foreground"
            >
              <RotateCcw className="mr-1 inline h-3 w-3" />
              Reset
            </button>
          </div>
        </div>

        <PatientForm value={input} onChange={update} />
      </div>

      {/* Result column (sticky on desktop) */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <ResultPanel prediction={prediction} input={input} />
      </div>
    </div>
  );
}
