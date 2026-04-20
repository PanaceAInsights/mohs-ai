import { Badge } from "@/components/ui/badge";
import { ZoneCards } from "@/components/zones/zone-cards";
import { ParadoxReveal } from "@/components/zones/paradox-reveal";
import { ParadoxScatter } from "@/components/zones/paradox-scatter";

export const metadata = {
  title: "H-zone paradox",
  description:
    "Why H-zone (high-risk) tumours require fewer sections than L-zone (low-risk) — and what it actually means.",
};

export default function ZonesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 border-b border-border/60 pb-6">
        <Badge
          variant="outline"
          className="mb-3 border-destructive/40 bg-destructive/5 text-destructive"
        >
          Counterintuitive · manuscript §4.2
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          The H-zone paradox
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Textbook Mohs triage says the H-zone is the high-risk territory —
          nose, ear, eye, lip. You'd expect it to need the most sections. In
          this cohort of 408 procedures,{" "}
          <span className="text-foreground">the opposite happens</span>. L-zone
          tumours require almost twice as many sections on average. Why?
        </p>
      </header>

      {/* Zone cards */}
      <section className="mb-14">
        <h2 className="mb-4 text-lg font-semibold">Three zones, three stories</h2>
        <ZoneCards />
      </section>

      {/* Paradox reveal bar chart */}
      <section className="mb-14">
        <div className="mb-4 max-w-2xl">
          <h2 className="text-lg font-semibold">See the flip</h2>
          <p className="text-sm text-muted-foreground">
            Compare the three zones side by side. Switch the metric to spot
            the lurking variable.
          </p>
        </div>
        <ParadoxReveal />
      </section>

      {/* Interpretation */}
      <section className="mb-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-accent/40 bg-accent/5 p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Key finding
            </p>
            <h3 className="mt-2 text-xl font-semibold">
              Size explains section count, not anatomical risk label.
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              L-zone tumours in this cohort averaged{" "}
              <span className="font-mono text-foreground">12.55 cm²</span>{" "}
              versus{" "}
              <span className="font-mono text-foreground">2.09 cm²</span> for
              H-zone — a six-fold difference. Patients only end up with a
              Mohs referral on L-zone sites (neck, trunk, hand) when the
              tumour has grown large enough to warrant it.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Smaller H-zone tumours reach Mohs earlier because of aesthetic
              concerns, producing a lopsided size distribution between zones.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Surgical behaviour clue
            </p>
            <h3 className="mt-2 text-xl font-semibold">
              H-zone surgeons cut in smaller slices.
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Sections per stage:
            </p>
            <div className="mt-3 flex items-end gap-4">
              <div>
                <p className="font-mono text-4xl tabular-nums text-primary">2.98</p>
                <p className="text-xs text-muted-foreground">H-zone</p>
              </div>
              <span className="pb-1 text-muted-foreground">vs</span>
              <div>
                <p className="font-mono text-4xl tabular-nums text-destructive">
                  8.58
                </p>
                <p className="text-xs text-muted-foreground">L-zone</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Same surgeon, same scalpel — but on the nose they take smaller,
              more conservative cuts to spare cosmetically sensitive tissue.
              Fewer sections per stage, more stages, same total caution.
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Stages-per-case didn't differ significantly between zones
              (p = 0.11 in the manuscript) — the real variable is slice size.
            </p>
          </div>
        </div>
      </section>

      {/* Scatter */}
      <section>
        <ParadoxScatter />
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
          Caveat from the paper: the L-zone cohort is small (n = 18), so these
          conclusions need external validation. Still, the pattern is
          consistent with the size-driven interpretation of the ML model's
          predictions.
        </p>
      </section>
    </div>
  );
}
