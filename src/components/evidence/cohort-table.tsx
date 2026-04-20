"use client";

import { motion } from "framer-motion";
import { cohort } from "@/lib/manuscript-data";
import { cn } from "@/lib/utils";

type Row = {
  group: string;
  rows: {
    label: string;
    total: string;
    lt13: string;
    ge13: string;
    p?: string;
    significant?: boolean;
  }[];
};

const TABLE1: Row[] = [
  {
    group: "Demographics",
    rows: [
      {
        label: "Age, years — mean ± SD",
        total: "68.5 ± 12.9",
        lt13: "66.1 ± 13.4",
        ge13: "71.0 ± 11.8",
        p: "<0.001",
        significant: true,
      },
      {
        label: "Male — n (%)",
        total: "236 (57.8%)",
        lt13: "115 (54.0%)",
        ge13: "121 (62.1%)",
        p: "0.081",
      },
    ],
  },
  {
    group: "Tumour characteristics",
    rows: [
      {
        label: "Tumour Size X, mm",
        total: "17.5 ± 16.3",
        lt13: "9.1 ± 7.6",
        ge13: "26.5 ± 18.5",
        p: "<0.001",
        significant: true,
      },
      {
        label: "Tumour Size Y, mm",
        total: "16.4 ± 16.4",
        lt13: "8.7 ± 7.8",
        ge13: "24.8 ± 19.2",
        p: "<0.001",
        significant: true,
      },
      {
        label: "Tumour Area, cm²",
        total: "3.4 ± 6.3",
        lt13: "0.75 ± 0.98",
        ge13: "6.32 ± 8.09",
        p: "<0.001",
        significant: true,
      },
      {
        label: "BCC — n (%)",
        total: "367 (89.9%)",
        lt13: "198 (93.0%)",
        ge13: "169 (86.7%)",
        p: "0.023",
        significant: true,
      },
      {
        label: "SCC — n (%)",
        total: "41 (10.1%)",
        lt13: "15 (7.0%)",
        ge13: "26 (13.3%)",
        p: "0.023",
        significant: true,
      },
      {
        label: "Recurrent — n (%)",
        total: "127 (31.1%)",
        lt13: "45 (21.1%)",
        ge13: "82 (42.1%)",
        p: "<0.001",
        significant: true,
      },
      {
        label: "Aggressive histopathology — n (%)",
        total: "249 (61.0%)",
        lt13: "113 (53.0%)",
        ge13: "136 (69.7%)",
        p: "<0.001",
        significant: true,
      },
    ],
  },
  {
    group: "Anatomy",
    rows: [
      {
        label: "Head & Neck — n (%)",
        total: "381 (93.4%)",
        lt13: "205 (96.2%)",
        ge13: "176 (90.3%)",
        p: "0.002",
        significant: true,
      },
      {
        label: "H-zone — n (%)",
        total: "291 (71.3%)",
        lt13: "136 (63.8%)",
        ge13: "155 (79.5%)",
        p: "<0.001",
        significant: true,
      },
      {
        label: "M-zone — n (%)",
        total: "100 (24.5%)",
        lt13: "64 (30.0%)",
        ge13: "36 (18.5%)",
        p: "<0.001",
        significant: true,
      },
      {
        label: "L-zone — n (%)",
        total: "17 (4.2%)",
        lt13: "13 (6.1%)",
        ge13: "4 (2.1%)",
        p: "<0.001",
        significant: true,
      },
    ],
  },
];

export function CohortTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
            <th className="px-4 py-3 font-medium">Characteristic</th>
            <th className="px-4 py-3 text-right font-medium">
              All
              <div className="font-mono text-[10px] tabular-nums text-foreground/70">
                n = {cohort.n}
              </div>
            </th>
            <th className="px-4 py-3 text-right font-medium">
              &lt;13 sections
              <div className="font-mono text-[10px] tabular-nums text-foreground/70">
                n = {cohort.nLt13}
              </div>
            </th>
            <th className="px-4 py-3 text-right font-medium">
              ≥13 sections
              <div className="font-mono text-[10px] tabular-nums text-destructive/90">
                n = {cohort.nGe13}
              </div>
            </th>
            <th className="px-4 py-3 text-right font-medium">p</th>
          </tr>
        </thead>
        <tbody>
          {TABLE1.map((group) => (
            <>
              <tr
                key={`g-${group.group}`}
                className="border-b border-border/40 bg-muted/10"
              >
                <td
                  colSpan={5}
                  className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  {group.group}
                </td>
              </tr>
              {group.rows.map((r) => (
                <motion.tr
                  key={r.label}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-b border-border/30 last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-2 text-foreground/90">{r.label}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">
                    {r.total}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground/80">
                    {r.lt13}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground/80">
                    {r.ge13}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2 text-right font-mono tabular-nums",
                      r.significant ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {r.p ?? "—"}
                  </td>
                </motion.tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border/60 bg-muted/10 px-4 py-2 text-[10px] text-muted-foreground">
        From manuscript Table 1. Continuous variables: Mann–Whitney U;
        categorical: χ². Bold-coloured p-values indicate significance at 0.05.
      </p>
    </div>
  );
}
