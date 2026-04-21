import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrScheduler } from "@/components/tools/or-scheduler";
import { RevenueProjector } from "@/components/tools/revenue-projector";
import { DefectEstimator } from "@/components/tools/defect-estimator";
import { CaseSimilarity } from "@/components/tools/case-similarity";
import { PrintButton } from "@/components/print-button";

export const metadata = {
  title: "Clinical tools",
  description:
    "Multi-room procedure day scheduler, MBS revenue projector, defect-size estimator, and case-similarity finder — all powered by the manuscript's model.",
};

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 border-b border-border/60 pb-6">
        <Badge
          variant="outline"
          className="mb-3 border-primary/30 bg-primary/5 text-primary"
        >
          Operations · planning · analytics
        </Badge>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Clinical tools
          </h1>
          <PrintButton label="Save as PDF" />
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Four micro-applications that translate the predictor into practice:
          theatre scheduling, revenue forecasting, wound-size planning, and
          retrieval of historical cases most similar to yours.
        </p>
      </header>

      <Tabs defaultValue="scheduler" className="space-y-6">
        <TabsList className="mb-2 flex w-full flex-wrap gap-1 rounded-lg border border-border/60 bg-card/40 p-1">
          <TabsTrigger
            value="scheduler"
            className="flex-1 min-w-[120px] px-3 py-2 text-xs sm:text-sm"
          >
            <span className="text-base leading-none">🏥</span>
            <span className="ml-1.5">Day Scheduler</span>
          </TabsTrigger>
          <TabsTrigger
            value="revenue"
            className="flex-1 min-w-[120px] px-3 py-2 text-xs sm:text-sm"
          >
            <span className="text-base leading-none">💰</span>
            <span className="ml-1.5">MBS Revenue</span>
          </TabsTrigger>
          <TabsTrigger
            value="defect"
            className="flex-1 min-w-[120px] px-3 py-2 text-xs sm:text-sm"
          >
            <span className="text-base leading-none">📐</span>
            <span className="ml-1.5">Defect Estimator</span>
          </TabsTrigger>
          <TabsTrigger
            value="similarity"
            className="flex-1 min-w-[120px] px-3 py-2 text-xs sm:text-sm"
          >
            <span className="text-base leading-none">🔎</span>
            <span className="ml-1.5">Case Similarity</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduler" className="space-y-3">
          <h2 className="text-lg font-semibold">
            Multi-room Mohs day scheduler
          </h2>
          <p className="text-sm text-muted-foreground">
            Book tomorrow's Mohs list. Add each patient with name, MRN, tumour
            size, and — if you know it — the time they'll arrive. The
            predictor estimates probability of ≥13 sections and the likely
            stage count per case. The simulator then schedules the day for one
            surgeon rotating through up to six procedure rooms, respecting
            arrival times, priority flags, and an optional lunch break. Click
            "Suggest arrivals" to let the model tell each patient when to
            arrive; export to CSV for the front desk.
          </p>
          <OrScheduler />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-3">
          <h2 className="text-lg font-semibold">MBS revenue projector</h2>
          <p className="text-sm text-muted-foreground">
            Based on verified Australian MBS fees (31000 / 31001 / 31002 as of
            1 Jul 2025). Adjust case volume, case mix, and bulk-billing share —
            weekly, monthly, and annual projections update live.
          </p>
          <RevenueProjector />
        </TabsContent>

        <TabsContent value="defect" className="space-y-3">
          <h2 className="text-lg font-semibold">Defect size estimator</h2>
          <p className="text-sm text-muted-foreground">
            Linear regression on this cohort's 408 cases — tumour area and
            stage count → defect area. R² ≈ 0.52, a useful planning aid but
            not a substitute for operative judgement.
          </p>
          <DefectEstimator />
        </TabsContent>

        <TabsContent value="similarity" className="space-y-3">
          <h2 className="text-lg font-semibold">Case similarity finder</h2>
          <p className="text-sm text-muted-foreground">
            k-nearest-neighbours search across the 408-case cohort on
            standardised numeric features with categorical penalties. Shows the
            6 most similar historical cases alongside the model's probability
            so you can see where the two agree or diverge.
          </p>
          <CaseSimilarity />
        </TabsContent>
      </Tabs>
    </div>
  );
}
