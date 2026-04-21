"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { mbsCodes } from "@/lib/manuscript-data";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  "31000": "bg-primary",
  "31001": "bg-accent",
  "31002": "bg-destructive",
};

export function RevenueProjector() {
  const [casesPerWeek, setCasesPerWeek] = useState(20);
  const [pctComplex, setPctComplex] = useState(48); // cohort default for ≥13 sections
  // Remainder distributes between 31000 and 31001 — default ~70/22/8
  const [pctMid, setPctMid] = useState(22);
  const [bulkBillPct, setBulkBillPct] = useState(50);

  const calc = useMemo(() => {
    const pctSimple = Math.max(0, 100 - pctComplex - pctMid);
    const byCode = {
      "31000": pctSimple,
      "31001": pctMid,
      "31002": pctComplex,
    } as const;

    const perWeek = mbsCodes.map((m) => {
      const count = (casesPerWeek * (byCode[m.code as "31000"|"31001"|"31002"])) / 100;
      const gross = count * m.fee;
      const rebate = count * m.rebate75;
      const gap = count * m.gap;
      // Bulk-billing: surgeon only collects the 75% rebate on those cases
      const bulkCount = (count * bulkBillPct) / 100;
      const nonBulkCount = count - bulkCount;
      const net = bulkCount * m.rebate75 + nonBulkCount * m.fee;
      return { code: m.code, label: m.label, count, gross, rebate, gap, net };
    });

    const totals = perWeek.reduce(
      (acc, r) => ({
        gross: acc.gross + r.gross,
        net: acc.net + r.net,
        count: acc.count + r.count,
      }),
      { gross: 0, net: 0, count: 0 },
    );

    return {
      perWeek,
      weekly: totals,
      monthly: { gross: totals.gross * 4.33, net: totals.net * 4.33 },
      annual: { gross: totals.gross * 48, net: totals.net * 48 },
      pctByCode: byCode,
    };
  }, [casesPerWeek, pctComplex, pctMid, bulkBillPct]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Cases per week
            </p>
            <p className="font-mono text-3xl tabular-nums text-primary">
              {casesPerWeek}
            </p>
          </div>
          <Slider
            className="mt-3"
            min={5}
            max={80}
            step={1}
            value={[casesPerWeek]}
            onValueChange={(v) => setCasesPerWeek(Array.isArray(v) ? v[0] ?? 20 : v)}
          />
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Bulk-billed portion
            </p>
            <p className="font-mono text-3xl tabular-nums text-accent">
              {bulkBillPct}%
            </p>
          </div>
          <Slider
            className="mt-3"
            min={0}
            max={100}
            step={5}
            value={[bulkBillPct]}
            onValueChange={(v) => setBulkBillPct(Array.isArray(v) ? v[0] ?? 50 : v)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Case mix
          </p>
          <p className="text-[11px] text-muted-foreground">
            Cohort default: 47.8% complex (≥13 sections)
          </p>
        </div>
        <MixBar percentages={calc.pctByCode} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SliderRow
            label="31002 · ≥13 sections"
            value={pctComplex}
            onChange={setPctComplex}
            color="bg-destructive"
            max={100}
          />
          <SliderRow
            label="31001 · 7–12 sections"
            value={pctMid}
            onChange={setPctMid}
            color="bg-accent"
            max={100 - pctComplex}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <RevenueCard
          label="Weekly"
          gross={calc.weekly.gross}
          net={calc.weekly.net}
        />
        <RevenueCard
          label="Monthly"
          gross={calc.monthly.gross}
          net={calc.monthly.net}
          tone="primary"
        />
        <RevenueCard
          label="Annual (48 wk)"
          gross={calc.annual.gross}
          net={calc.annual.net}
          tone="accent"
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 text-right font-medium">Cases/wk</th>
              <th className="px-4 py-2 text-right font-medium">Schedule fee</th>
              <th className="px-4 py-2 text-right font-medium">Gross/wk</th>
            </tr>
          </thead>
          <tbody>
            {calc.perWeek.map((r) => (
              <tr key={r.code} className="border-b border-border/30 last:border-b-0">
                <td className="px-4 py-2 font-mono tabular-nums">
                  <span
                    className={cn(
                      "mr-2 inline-block h-2 w-2 rounded-full",
                      CATEGORY_COLORS[r.code],
                    )}
                  />
                  {r.code}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{r.label}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">
                  {r.count.toFixed(1)}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">
                  A${r.gross && r.count > 0 ? (r.gross / r.count).toFixed(2) : "0.00"}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground">
                  A${r.gross.toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Estimates based on verified Australian MBS fees (1 Jul 2025): 31000 A$677.70 ·
        31001 A$847.00 · 31002 A$1,016.40. Bulk-billed cases assume only the 75%
        Medicare rebate is collected. Actual practice mix varies by centre and clinician.
      </p>
    </div>
  );
}

function MixBar({
  percentages,
}: {
  percentages: Record<string, number>;
}) {
  return (
    <div className="flex h-4 overflow-hidden rounded-md">
      {Object.entries(percentages).map(([code, pct]) => (
        <motion.div
          key={code}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className={cn(CATEGORY_COLORS[code], "flex items-center justify-center")}
          title={`${code} · ${pct.toFixed(1)}%`}
        >
          <span className="font-mono text-[10px] text-background/90">
            {pct > 8 ? `${pct.toFixed(0)}%` : ""}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  color,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  max: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between pb-1">
        <span className="text-xs">
          <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", color)} />
          {label}
        </span>
        <span className="font-mono text-sm tabular-nums">{value}%</span>
      </div>
      <Slider
        min={0}
        max={max}
        step={1}
        value={[Math.min(value, max)]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] ?? value : v)}
      />
    </div>
  );
}

function RevenueCard({
  label,
  gross,
  net,
  tone = "foreground",
}: {
  label: string;
  gross: number;
  net: number;
  tone?: "foreground" | "primary" | "accent";
}) {
  const color =
    tone === "primary"
      ? "text-primary"
      : tone === "accent"
        ? "text-accent"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <motion.p
        key={gross}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("mt-1 font-mono text-3xl tabular-nums", color)}
      >
        A${gross.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </motion.p>
      <p className="text-[11px] text-muted-foreground">
        Net after bulk-billing: A$
        {net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}
