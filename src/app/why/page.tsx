import { Badge } from "@/components/ui/badge";
import { ShapImportance } from "@/components/why/shap-importance";
import { DependencePlot } from "@/components/why/dependence-plot";
import { Waterfall } from "@/components/why/waterfall";
import { headline, shapImportance } from "@/lib/manuscript-data";

export const metadata = {
  title: "Why",
  description:
    "SHAP importance, dependence plot with the 1.5 cm² tumour-area threshold, and per-case waterfall.",
};

export default function WhyPage() {
  const topFeature = shapImportance[0];
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 border-b border-border/60 pb-6">
        <Badge
          variant="outline"
          className="mb-3 border-primary/30 bg-primary/5 text-primary"
        >
          SHAP explainability · manuscript §3.4
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Why the model decides what it decides
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          SHAP (SHapley Additive exPlanations) decomposes each prediction into
          per-feature contributions. Across the cohort, the model has learned a
          clean story — one feature dominates, and it has a threshold.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Fact
            kicker="Top predictor"
            value={topFeature.feature}
            sub={`SHAP ${topFeature.value.toFixed(3)}`}
          />
          <Fact
            kicker="Clinical threshold"
            value="1.5 cm²"
            sub="ellipse tumour area"
          />
          <Fact
            kicker="High-confidence acc"
            value={`${(headline.highConfidenceAccuracy * 100).toFixed(1)}%`}
            sub="when |p−0.5| ≥ 0.15"
          />
        </div>
      </header>

      {/* Global importance */}
      <section className="mb-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-lg font-semibold">Global importance</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Mean absolute SHAP value, computed across the 82-case held-out test
            set. Values here are from our retrained ensemble — rankings match
            the manuscript's Figure 4A.
          </p>
          <div className="mt-5">
            <ShapImportance />
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <h3 className="text-sm font-medium">How to read these bars</h3>
          <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
            <li>
              <span className="font-mono text-primary">Tumour area</span>{" "}
              dominates — as large as the next four features combined. This is
              consistent across every tree-based model in the study.
            </li>
            <li>
              <span className="font-mono text-primary">Size X and Y</span> are
              highly correlated with area but carry independent signal because
              elongated tumours behave differently from round ones.
            </li>
            <li>
              <span className="font-mono text-primary">Anatomical unit</span>{" "}
              matters more than surgeon experience in this cohort — a function
              of how tumours distribute across body parts, not a causal effect
              of the anatomy itself.
            </li>
            <li>
              <span className="font-mono text-primary">See-and-do</span> and{" "}
              <span className="font-mono text-primary">experience</span>{" "}
              contribute almost nothing — the paper flags this as likely
              selection bias, not lack of skill effect.
            </li>
          </ul>
        </div>
      </section>

      {/* Dependence plot */}
      <section className="mb-14">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Tumour-area dependence</h2>
          <p className="text-sm text-muted-foreground">
            The model learned a threshold at ~1.5 cm². Below it the prediction
            stays under 50%; above it the probability of ≥13 sections climbs
            steeply. Toggle SCC / Recurrent / Aggressive histology to see the
            whole curve shift.
          </p>
        </div>
        <DependencePlot />
      </section>

      {/* Waterfall */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Per-case waterfall</h2>
          <p className="text-sm text-muted-foreground">
            Starting from the cohort's base rate, each feature adds or subtracts
            probability. Pick a case below to see its full breakdown.
          </p>
        </div>
        <Waterfall />
      </section>
    </div>
  );
}

function Fact({
  kicker,
  value,
  sub,
}: {
  kicker: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {kicker}
      </p>
      <p className="mt-1 font-mono text-2xl tabular-nums text-foreground">
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
