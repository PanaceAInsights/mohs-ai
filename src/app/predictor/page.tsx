import { Badge } from "@/components/ui/badge";
import { PredictorApp } from "@/components/predictor/predictor-app";
import { headline } from "@/lib/manuscript-data";

export const metadata = {
  title: "Predictor",
  description:
    "Enter 12 pre-operative variables and get a live calibrated probability that this Mohs procedure will require ≥13 tissue sections.",
};

export default function PredictorPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 flex flex-col gap-3 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge
            variant="outline"
            className="mb-3 border-primary/30 bg-primary/5 text-primary"
          >
            Live ensemble · runs in your browser
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Predictor
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Calibrated logistic regression shipped from the 30-model study. Every
            change to an input recomputes the probability, confidence, and factor
            breakdown — there is no server round-trip.
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              CV AUC
            </p>
            <p className="font-mono text-xl tabular-nums text-primary">
              {headline.cvAuc.toFixed(3)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              High-conf acc
            </p>
            <p className="font-mono text-xl tabular-nums text-accent">
              {(headline.highConfidenceAccuracy * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </header>

      <PredictorApp />

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Not a substitute for clinical judgement. External validation in
        independent cohorts is pending.
      </p>
    </div>
  );
}
