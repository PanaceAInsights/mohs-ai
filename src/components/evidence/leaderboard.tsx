"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { leaderboard } from "@/lib/manuscript-data";
import { cn } from "@/lib/utils";

type Row = (typeof leaderboard)[number];
type SortKey = "cvAuc" | "testAuc" | "testF1" | "brier";

const CATEGORY_COLORS: Record<string, string> = {
  Ensemble: "bg-destructive/20 text-destructive border-destructive/30",
  "Gradient Boosting": "bg-accent/20 text-accent border-accent/30",
  "Neural Network": "bg-primary/20 text-primary border-primary/30",
  Tree: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  SVM: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  Traditional:
    "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30",
};

const CATEGORIES = [
  "All",
  "Ensemble",
  "Gradient Boosting",
  "Neural Network",
  "Tree",
  "SVM",
  "Traditional",
] as const;

const SORTS: { key: SortKey; label: string; better: "higher" | "lower" }[] = [
  { key: "cvAuc", label: "CV AUC", better: "higher" },
  { key: "testAuc", label: "Test AUC", better: "higher" },
  { key: "testF1", label: "F1", better: "higher" },
  { key: "brier", label: "Brier", better: "lower" },
];

export function Leaderboard() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [sort, setSort] = useState<SortKey>("cvAuc");

  const rows = useMemo(() => {
    const filtered =
      category === "All"
        ? [...leaderboard]
        : leaderboard.filter((r) => r.category === category);
    const better = SORTS.find((s) => s.key === sort)!.better;
    return filtered.sort((a, b) =>
      better === "higher" ? b[sort] - a[sort] : a[sort] - b[sort],
    );
  }, [category, sort]);

  const best = rows[0];
  const worst = rows[rows.length - 1];
  const range = useMemo(() => {
    const vals = rows.map((r) => r[sort]);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [rows, sort]);

  return (
    <div className="space-y-4">
      {/* controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition",
                c === category
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground",
              )}
            >
              {c}
              {c !== "All" && (
                <span className="ml-1 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {leaderboard.filter((r) => r.category === c).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition",
                s.key === sort
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground",
              )}
            >
              Sort: {s.label}
              {s.better === "higher" ? (
                <ArrowDown className="h-3 w-3" />
              ) : (
                <ArrowUp className="h-3 w-3" />
              )}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing <span className="font-mono tabular-nums">{rows.length}</span> of{" "}
        <span className="font-mono tabular-nums">{leaderboard.length}</span>{" "}
        algorithms evaluated in the manuscript. Lighter category fills in the
        right chart column.
      </p>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card/80 backdrop-blur">
            <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 text-right font-medium">CV AUC</th>
              <th className="px-4 py-3 text-right font-medium">Test AUC</th>
              <th className="px-4 py-3 text-right font-medium">F1</th>
              <th className="px-4 py-3 text-right font-medium">Brier</th>
              <th className="px-4 py-3 text-right font-medium min-w-32">
                {SORTS.find((s) => s.key === sort)!.label}
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((row, idx) => (
                <LeaderboardRow
                  key={row.model}
                  row={row}
                  rank={idx + 1}
                  sort={sort}
                  range={range}
                  isBest={row === best}
                  isWorst={row === worst && rows.length > 3}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeaderboardRow({
  row,
  rank,
  sort,
  range,
  isBest,
  isWorst,
}: {
  row: Row;
  rank: number;
  sort: SortKey;
  range: { min: number; max: number };
  isBest: boolean;
  isWorst: boolean;
}) {
  const better = SORTS.find((s) => s.key === sort)!.better;
  const v = row[sort];
  // Normalise bar width 0→1 across the visible subset
  const frac =
    range.max === range.min
      ? 1
      : better === "higher"
        ? (v - range.min) / (range.max - range.min)
        : (range.max - v) / (range.max - range.min);

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "border-b border-border/30 last:border-b-0",
        isBest && "bg-primary/5",
        isWorst && "opacity-70",
      )}
    >
      <td className="px-4 py-2 font-mono text-xs tabular-nums text-muted-foreground">
        {rank}
      </td>
      <td className="px-4 py-2">
        <span className="truncate text-foreground/90">{row.model}</span>
        {isBest && (
          <span className="ml-2 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
            Best
          </span>
        )}
      </td>
      <td className="px-4 py-2">
        <span
          className={cn(
            "inline-block rounded border px-1.5 py-0.5 text-[10px]",
            CATEGORY_COLORS[row.category],
          )}
        >
          {row.category}
        </span>
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground/80">
        {row.cvAuc.toFixed(3)}
        <span className="pl-1 text-[10px] text-muted-foreground">
          ±{row.cvSd.toFixed(2)}
        </span>
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground/80">
        {row.testAuc.toFixed(3)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground/80">
        {row.testF1.toFixed(3)}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground/80">
        {row.brier.toFixed(3)}
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center justify-end gap-2">
          <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={false}
              animate={{ width: `${Math.max(frac * 100, 2)}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
              className={cn(
                "h-full rounded-full",
                CATEGORY_COLORS[row.category]?.split(" ")[0].replace(/\/\d+/, "/80"),
              )}
            />
          </div>
          <span className="w-12 text-right font-mono text-xs tabular-nums">
            {v.toFixed(3)}
          </span>
        </div>
      </td>
    </motion.tr>
  );
}
