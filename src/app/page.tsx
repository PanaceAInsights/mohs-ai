import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Compass,
  Database,
  Layers,
  Microscope,
  Quote,
  Sparkles,
  Workflow,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricStat } from "@/components/metric-stat";
import { MiniPredictor } from "@/components/mini-predictor";
import { cohort, headline, paper, shapImportance } from "@/lib/manuscript-data";
import { cn } from "@/lib/utils";
import shippingMetrics from "../../public/data/shipping.json";

const SECTIONS = [
  {
    href: "/predictor",
    icon: Brain,
    title: "Predictor",
    desc: "Enter 12 pre-operative variables. Get the probability of ≥13 sections with a 95% confidence band and a high-confidence flag.",
    tag: "Live ensemble",
  },
  {
    href: "/evidence",
    icon: BarChart3,
    title: "Evidence",
    desc: "Table 1 cohort. Table 2 effect sizes. Table 3 leaderboard of all 30 algorithms evaluated in the manuscript.",
    tag: "30 models",
  },
  {
    href: "/why",
    icon: Microscope,
    title: "Why",
    desc: "SHAP dependence plots reveal the 1.5 cm² tumour-area threshold that drives every high-section-count prediction.",
    tag: "SHAP",
  },
  {
    href: "/zones",
    icon: Compass,
    title: "H-zone paradox",
    desc: "H-zone is anatomically high-risk yet requires fewer sections — because L-zone tumours are ~6× larger. Interactive story.",
    tag: "Counter-intuitive",
  },
  {
    href: "/tools",
    icon: Layers,
    title: "Clinical tools",
    desc: "Multi-room OR day scheduler, MBS revenue projector, defect-size estimator, and case-similarity finder.",
    tag: "Operations",
  },
  {
    href: "/chat",
    icon: Sparkles,
    title: "Ask MOHS AI",
    desc: "Claude Sonnet answers patient-education questions and explains SHAP contributions in plain English.",
    tag: "AI assistant",
  },
] as const;

const PIPELINE = [
  {
    icon: Database,
    title: "Pre-operative input",
    desc: "12 variables a clinician already has: age, sex, tumour size X and Y, location, histology subtype, recurrence status, biopsy method.",
  },
  {
    icon: Workflow,
    title: "Stacking ensemble",
    desc: "30 ML algorithms evaluated; calibrated logistic regression ships for inference at <1 ms, ensemble serves static context.",
  },
  {
    icon: Brain,
    title: "Calibrated probability",
    desc: "Probability of ≥13 sections + confidence flag. Exceeds the 1.5 cm² SHAP threshold? Flag it for extended OR time.",
  },
] as const;

export default function Home() {
  return (
    <div className="relative">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.78_0.14_195/0.15),transparent_55%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>
        <div className="grain absolute inset-0" aria-hidden />

        <div className="mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
          <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-6">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/5 text-primary"
              >
                <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Published 2026 · The Skin Hospital, Sydney
              </Badge>

              <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
                Predict which Mohs cases will need{" "}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    ≥13 sections
                  </span>
                  <svg
                    aria-hidden
                    viewBox="0 0 300 10"
                    className="absolute -bottom-1 left-0 h-2 w-full text-primary/50"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 5 Q 75 0 150 5 T 300 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
                <span className="block text-muted-foreground">
                  before the patient sits down.
                </span>
              </h1>

              <p className="max-w-xl text-lg text-muted-foreground">
                An ensemble of 30 machine-learning models trained on {cohort.n}{" "}
                consecutive procedures identifies complex cases from pre-operative
                clinical features — improving scheduling, counselling, and resource
                allocation.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/predictor"
                  className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-sm")}
                >
                  Try the full predictor <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
                <Link
                  href="/evidence"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "h-11 px-5 text-sm",
                  )}
                >
                  See the evidence
                </Link>
              </div>

              <p className="text-xs text-muted-foreground">
                {paper.authors.join(", ")} ·{" "}
                <span className="font-mono">{paper.period}</span> ·{" "}
                <Link
                  href={paper.deploymentUrl}
                  className="underline-offset-4 hover:underline"
                >
                  mohs.panacea-i.com
                </Link>
              </p>
            </div>

            {/* Live mini-predictor — the WOW factor on first paint */}
            <MiniPredictor />
          </div>
        </div>
      </section>

      {/* ── Hero metrics strip ──────────────────────────────────────── */}
      <section className="border-b border-border/60">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4 sm:px-6">
          <MetricStat value={cohort.n} label="Procedures analysed" />
          <MetricStat
            value={shippingMetrics.cv_auc_mean}
            decimals={3}
            label="Shipping CV AUC"
            accent="primary"
          />
          <MetricStat
            value={headline.highConfidenceAccuracy * 100}
            decimals={1}
            suffix="%"
            label="High-confidence accuracy"
            accent="accent"
          />
          <MetricStat
            value={headline.algorithmsEvaluated}
            label="Algorithms evaluated"
          />
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <Badge
            variant="outline"
            className="mb-4 border-accent/40 bg-accent/5 text-accent"
          >
            Pipeline
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            From twelve inputs to a calibrated decision.
          </h2>
          <p className="mt-3 text-muted-foreground">
            The tool you just used in the hero is the shipping model. It runs a
            calibrated logistic regression in your browser in under a millisecond —
            no round-trip to a server, no model to wait on.
          </p>
        </div>

        <ol className="relative grid gap-6 sm:grid-cols-3">
          <div
            aria-hidden
            className="absolute top-5 left-0 hidden h-px w-full bg-gradient-to-r from-transparent via-border to-transparent sm:block"
          />
          {PIPELINE.map((s, idx) => {
            const Icon = s.icon;
            return (
              <li
                key={s.title}
                className="relative rounded-xl border border-border/60 bg-card p-5"
              >
                <div className="flex items-center gap-3 pb-3">
                  <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Step {idx + 1}
                  </span>
                </div>
                <h3 className="text-base font-medium">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── Section cards ───────────────────────────────────────────── */}
      <section className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Six lenses on the same study.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every page traces back to a specific result in the manuscript. No
              fabricated statistics, no demo data.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-6 transition hover:border-primary/40 hover:bg-card/80"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition group-hover:opacity-100" />
                  <div className="flex items-start justify-between pb-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {s.tag}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-medium">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs text-primary">
                    Open
                    <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Top-5 features + methodology ─────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <Badge
              variant="outline"
              className="mb-4 border-primary/30 bg-primary/5 text-primary"
            >
              Feature importance
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Tumour area dominates. Everything else is secondary.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              SHAP analysis across the ensemble puts the ellipse-formula tumour
              area above every anatomical or surgeon factor — and the relationship
              has a clean threshold at ~1.5 cm².
            </p>
            <div className="mt-6 space-y-2">
              {shapImportance.slice(0, 6).map((f) => (
                <div key={f.feature} className="flex items-center gap-3">
                  <span className="w-48 truncate text-xs text-muted-foreground">
                    {f.feature}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${(f.value / 0.141) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-[11px] tabular-nums text-foreground/70">
                    {f.value.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <div className="flex items-center gap-3">
              <Quote className="h-5 w-5 text-accent" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                From the manuscript
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-foreground/90">
              “The stacking ensemble achieved the highest cross-validation AUC of{" "}
              <span className="font-mono tabular-nums">0.891</span> (95% CI{" "}
              <span className="font-mono tabular-nums">0.849–0.934</span>) and test
              AUC of <span className="font-mono tabular-nums">0.884</span>. Tumour
              area emerged as the strongest predictor (SHAP{" "}
              <span className="font-mono tabular-nums">0.141</span>) … wide
              neural-network architectures outperformed deeper configurations.”
            </p>
            <div className="mt-5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <p>
                Aksoy YA, Lee S, Moreno-Bonilla G. Development and Validation of
                Machine Learning Models for Predicting 13 or More Sections in Mohs
                Micrographic Surgery. <span className="italic">2026</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Methodology footer ──────────────────────────────────────── */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Cohort
              </p>
              <p className="mt-2 text-sm">
                {cohort.n} consecutive procedures from{" "}
                <span className="text-foreground">{paper.hospital}</span>. Mean
                age{" "}
                <span className="font-mono tabular-nums">{cohort.meanAge}</span> ±{" "}
                <span className="font-mono tabular-nums">{cohort.sdAge}</span>.
                BCC <span className="font-mono tabular-nums">{cohort.pctBcc}%</span>.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Outcome
              </p>
              <p className="mt-2 text-sm">
                Binary classification:{" "}
                <span className="text-foreground">≥13 vs &lt;13</span> sections.
                Cohort balance{" "}
                <span className="font-mono tabular-nums">
                  {cohort.pctGe13}% / {cohort.pctLt13}%
                </span>{" "}
                — aligned with the MBS 31002 billing cut-off.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Validation
              </p>
              <p className="mt-2 text-sm">
                5-fold stratified CV on 80% train, held-out{" "}
                <span className="font-mono tabular-nums">n=82</span> test.{" "}
                <span className="text-foreground">
                  {(headline.highConfidenceRate * 100).toFixed(1)}%
                </span>{" "}
                of test cases are high-confidence →{" "}
                <span className="font-mono tabular-nums text-accent">
                  {(headline.highConfidenceAccuracy * 100).toFixed(1)}% accuracy
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
