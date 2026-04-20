import Link from "next/link";
import { ArrowRight, BarChart3, Brain, Compass, Layers, Microscope, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MetricStat } from "@/components/metric-stat";
import { cohort, headline, paper, shapImportance } from "@/lib/manuscript-data";

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

export default function Home() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.78_0.14_195/0.15),transparent_55%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>
        <div className="grain absolute inset-0" aria-hidden />

        <div className="mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
          <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-6">
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
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
                    <path d="M0 5 Q 75 0 150 5 T 300 5" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </span>
                <span className="block text-muted-foreground">before the patient sits down.</span>
              </h1>

              <p className="max-w-xl text-lg text-muted-foreground">
                An ensemble of 30 machine-learning models trained on {cohort.n} consecutive
                procedures identifies complex cases from pre-operative clinical features —
                improving scheduling, counselling, and resource allocation.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/predictor"
                  className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-sm")}
                >
                  Try the predictor <ArrowRight className="ml-1.5 h-4 w-4" />
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
                {paper.authors.join(", ")} · <span className="font-mono">{paper.period}</span>
              </p>
            </div>

            {/* Visual: feature-importance teaser */}
            <div className="relative w-full max-w-md lg:w-auto">
              <div className="relative rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
                <div className="flex items-center justify-between pb-4">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    Stacking ensemble
                  </span>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">LR meta</Badge>
                </div>
                <div className="space-y-2">
                  {shapImportance.slice(0, 5).map((f) => (
                    <div key={f.feature} className="flex items-center gap-3">
                      <span className="w-40 truncate text-xs text-muted-foreground">
                        {f.feature}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                          style={{ width: `${(f.value / 0.141) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-[11px] tabular-nums text-foreground/70">
                        {f.value.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 border-t border-border/60 pt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      CV AUC
                    </span>
                    <span className="font-mono text-3xl font-semibold tabular-nums text-primary">
                      {headline.cvAuc.toFixed(3)}
                    </span>
                  </div>
                  <p className="pt-1 text-right text-[11px] text-muted-foreground">
                    95% CI {headline.cvAucCiLow.toFixed(3)}–{headline.cvAucCiHigh.toFixed(3)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero metrics strip */}
      <section className="border-b border-border/60">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4 sm:px-6">
          <MetricStat value={cohort.n} label="Procedures analysed" />
          <MetricStat
            value={headline.cvAuc}
            decimals={3}
            label="CV AUC (stacking)"
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

      {/* Sections grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Six lenses on the same study.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every page ties back to a specific result in the manuscript. No fabricated
            statistics, no demo data.
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
      </section>

      {/* Methodology strip */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Cohort
              </p>
              <p className="mt-2 text-sm">
                {cohort.n} consecutive procedures from{" "}
                <span className="text-foreground">{paper.hospital}</span>. Mean age{" "}
                <span className="font-mono tabular-nums">{cohort.meanAge}</span> ±{" "}
                <span className="font-mono tabular-nums">{cohort.sdAge}</span>. BCC{" "}
                <span className="font-mono tabular-nums">{cohort.pctBcc}%</span>.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Outcome
              </p>
              <p className="mt-2 text-sm">
                Binary classification: <span className="text-foreground">≥13 vs &lt;13</span>{" "}
                sections. Cohort balance{" "}
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
