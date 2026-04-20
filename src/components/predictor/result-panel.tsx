"use client";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Prediction } from "@/lib/model";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProbabilityRing } from "./probability-ring";
import { FactorBars } from "./factor-bars";
import type { PatientInput } from "@/lib/model-types";

export function ResultPanel({
  prediction,
  input,
}: {
  prediction: Prediction;
  input: PatientInput;
}) {
  const { probability, distanceToBoundary } = prediction;
  const complex = probability >= 0.5;

  // Lightweight 95% CI using sqrt(p*(1-p)/n_effective). n_eff ≈ 80
  // per-fold test size from the manuscript's split.
  const stdP = Math.sqrt((probability * (1 - probability)) / 80);
  const ciLow = Math.max(0, probability - 1.96 * stdP);
  const ciHigh = Math.min(1, probability + 1.96 * stdP);

  const areaPct = Math.min((prediction.tumourAreaCm2 / 8) * 100, 100);
  const thresholdPct = Math.min((1.5 / 8) * 100, 100);

  return (
    <div className="space-y-5">
      {/* Big probability ring */}
      <div className="flex flex-col items-center rounded-2xl border border-border/60 bg-card/60 p-6">
        <ProbabilityRing
          probability={probability}
          ciLow={ciLow}
          ciHigh={ciHigh}
        />
        <div className="mt-5 flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "border-border",
              complex
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-primary/40 bg-primary/10 text-primary",
            )}
          >
            {prediction.label}
          </Badge>
          <ConfidenceChip
            confidence={prediction.confidence}
            distance={distanceToBoundary}
          />
        </div>
      </div>

      {/* Tumour area + threshold */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Tumour area (ellipse)
          </span>
          <span className="font-mono text-2xl tabular-nums text-foreground">
            {prediction.tumourAreaCm2.toFixed(2)}
            <span className="text-sm text-muted-foreground"> cm²</span>
          </span>
        </div>
        <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-destructive"
            initial={false}
            animate={{ width: `${areaPct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
          <div
            aria-hidden
            className="absolute inset-y-0 w-px bg-foreground/70"
            style={{ left: `${thresholdPct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
          <span>0</span>
          <span className="text-foreground/80">
            1.5 cm² SHAP threshold
          </span>
          <span>8+ cm²</span>
        </div>
        {prediction.exceedsThreshold && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-accent">
            <AlertCircle className="h-3.5 w-3.5" />
            Above the 1.5 cm² clinical threshold — tumour-area-driven risk elevated.
          </p>
        )}
      </div>

      {/* MBS billing + factor bars */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/60 p-4">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Estimated MBS
          </span>
          <p className="mt-2 font-mono text-2xl tabular-nums text-foreground">
            {prediction.mbs.code}
          </p>
          <p className="text-sm text-muted-foreground">{prediction.mbs.label}</p>
          <p className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            Fee A${prediction.mbs.scheduleFee.toFixed(2)} · 75% rebate A$
            {(prediction.mbs.scheduleFee * 0.75).toFixed(2)}
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Code is a model-derived estimate. Final billing must reflect
            actual section count.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/60 p-4">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Confidence
          </span>
          <p className="mt-2 text-2xl font-medium capitalize">
            {prediction.confidence}
          </p>
          <p className="text-sm text-muted-foreground">
            Distance to 50% decision boundary:{" "}
            <span className="font-mono tabular-nums text-foreground">
              {distanceToBoundary.toFixed(3)}
            </span>
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Paper: high-confidence cases (|p−0.5| ≥ 0.15) reached 91.4% accuracy
            on held-out test.
          </p>
        </div>
      </div>

      {/* Factors */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-4">
        <div className="flex items-baseline justify-between pb-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            What's driving this prediction
          </span>
          <span className="text-[10px] text-muted-foreground">
            ← lowers · raises →
          </span>
        </div>
        <FactorBars factors={prediction.factors} />
      </div>

      <CopyNoteButton input={input} prediction={prediction} />
    </div>
  );
}

function ConfidenceChip({
  confidence,
  distance,
}: {
  confidence: "high" | "borderline";
  distance: number;
}) {
  const high = confidence === "high";
  return (
    <Badge
      variant="outline"
      className={cn(
        high
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
      )}
    >
      {high ? (
        <CheckCircle2 className="mr-1 h-3 w-3" />
      ) : (
        <AlertCircle className="mr-1 h-3 w-3" />
      )}
      {high ? "High confidence" : "Borderline"}{" "}
      <span className="ml-1 font-mono tabular-nums">·{distance.toFixed(2)}</span>
    </Badge>
  );
}

function CopyNoteButton({
  input,
  prediction,
}: {
  input: PatientInput;
  prediction: Prediction;
}) {
  const [copied, setCopied] = useState(false);
  const note = buildClinicalNote(input, prediction);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(note);
          setCopied(true);
          toast.success("Clinical note copied to clipboard.");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Could not copy to clipboard.");
        }
      }}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 bg-card/60 px-4 py-2.5 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
    >
      <Copy className="h-3.5 w-3.5" />
      {copied ? "Copied" : "Copy as clinical note"}
    </button>
  );
}

function buildClinicalNote(input: PatientInput, p: Prediction): string {
  const type =
    input.Tumour_Stats === "1" ? "BCC" : input.Tumour_Stats === "2" ? "SCC" : "Other";
  const status = input.Recurrent === "1" ? "recurrent" : "primary";
  const histo = input.Aggressive_Histopathology === "1" ? "aggressive" : "non-aggressive";
  const zone =
    input.Body_Zone === "1"
      ? "H-zone (high-risk)"
      : input.Body_Zone === "2"
        ? "M-zone (medium-risk)"
        : "L-zone (low-risk)";
  return [
    `MOHS AI preoperative assessment — ${new Date().toISOString().slice(0, 10)}`,
    `Patient: ${input.Age}-year-old ${input.Sex === "1" ? "male" : "female"}.`,
    `Lesion: ${status} ${histo} ${type} on the ${input.Unit.toLowerCase()} (${zone}), ${input.Tumour_Size_X}×${input.Tumour_Size_Y} mm, ellipse area ${p.tumourAreaCm2.toFixed(2)} cm² ${p.exceedsThreshold ? "(above the 1.5 cm² clinical threshold)" : ""}.`,
    ``,
    `Predicted probability of ≥13 sections: ${(p.probability * 100).toFixed(1)}% (${p.confidence} confidence).`,
    `Expected MBS item: ${p.mbs.code} — ${p.mbs.label} (fee A$${p.mbs.scheduleFee.toFixed(2)}).`,
    ``,
    `Top influences on this prediction:`,
    ...p.factors
      .slice(0, 5)
      .map(
        (f) =>
          `  · ${f.label}: ${
            f.kind === "numeric" ? (f.value as number).toFixed(1) : f.value
          } (${f.direction === "up" ? "↑" : f.direction === "down" ? "↓" : "·"} ${
            f.contribution.toFixed(3)
          })`,
      ),
    ``,
    `Model: Calibrated logistic regression (manuscript Table 3) · CV AUC 0.896, test AUC 0.884.`,
    `Source: mohs.panacea-i.com`,
  ].join("\n");
}
