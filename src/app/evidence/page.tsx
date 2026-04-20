import { Badge } from "@/components/ui/badge";
import { CohortTable } from "@/components/evidence/cohort-table";
import { EffectSizes } from "@/components/evidence/effect-sizes";
import { Leaderboard } from "@/components/evidence/leaderboard";
import { cohort, headline, leaderboard } from "@/lib/manuscript-data";

export const metadata = {
  title: "Evidence",
  description:
    "Table 1 cohort, Table 2 univariate effects, Table 3 leaderboard of all 30 algorithms from the MOHS AI manuscript.",
};

export default function EvidencePage() {
  const ensembleCount = leaderboard.filter((m) => m.category === "Ensemble").length;
  const nnCount = leaderboard.filter((m) => m.category === "Neural Network").length;
  const bestTestAuc = Math.max(...leaderboard.map((m) => m.testAuc));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 border-b border-border/60 pb-6">
        <Badge
          variant="outline"
          className="mb-3 border-accent/40 bg-accent/5 text-accent"
        >
          Manuscript Tables 1–3
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Evidence
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every number on this page is transcribed directly from the manuscript.
          Use the filters on the leaderboard to slice the 30-algorithm study by
          family.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Cohort size" value={cohort.n.toString()} />
          <Stat
            label="Best CV AUC"
            value={headline.cvAuc.toFixed(3)}
            tone="primary"
          />
          <Stat
            label="Best Test AUC"
            value={bestTestAuc.toFixed(3)}
            tone="accent"
          />
          <Stat label="Algorithms" value={leaderboard.length.toString()} />
        </div>
      </header>

      {/* Table 1 */}
      <section className="mb-14">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Table 1 — Baseline characteristics
            </h2>
            <p className="text-sm text-muted-foreground">
              Stratified by outcome (≥13 vs &lt;13 sections).
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Manuscript §3.1
          </span>
        </div>
        <CohortTable />
      </section>

      {/* Table 2 */}
      <section className="mb-14">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-semibold">Table 2 — Effect sizes</h2>
            <p className="text-sm text-muted-foreground">
              Cohen's d for continuous, Cramér's V for categorical variables.
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Manuscript §3.2
          </span>
        </div>
        <EffectSizes />
      </section>

      {/* Table 3 */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Table 3 — Model leaderboard
            </h2>
            <p className="text-sm text-muted-foreground">
              {leaderboard.length} algorithms across 6 families.{" "}
              {ensembleCount} ensemble · {nnCount} neural networks.
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Manuscript §3.3
          </span>
        </div>
        <Leaderboard />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "foreground",
}: {
  label: string;
  value: string;
  tone?: "foreground" | "primary" | "accent";
}) {
  const color =
    tone === "primary"
      ? "text-primary"
      : tone === "accent"
        ? "text-accent"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
