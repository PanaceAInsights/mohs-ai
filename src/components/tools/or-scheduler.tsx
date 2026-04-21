"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Shuffle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { predict } from "@/lib/model";
import { DEFAULT_PATIENT, type PatientInput } from "@/lib/model-types";
import {
  estimateStages,
  formatWallClock,
  SCHEDULER_PHASE_META,
  simulateDay,
  type Phase,
  type ScheduledCase,
} from "@/lib/scheduler";

type DayCase = {
  id: string;
  label: string;
  sizeX: number;
  sizeY: number;
  recurrent: boolean;
  aggressive: boolean;
  zone: PatientInput["Body_Zone"];
  unit: string;
  type: PatientInput["Tumour_Stats"];
};

const STARTER_CASES: DayCase[] = [
  {
    id: "c1",
    label: "BCC · nose",
    sizeX: 12,
    sizeY: 10,
    recurrent: false,
    aggressive: false,
    zone: "1",
    unit: "NOSE",
    type: "1",
  },
  {
    id: "c2",
    label: "BCC · cheek",
    sizeX: 22,
    sizeY: 16,
    recurrent: false,
    aggressive: true,
    zone: "2",
    unit: "CHEEK",
    type: "1",
  },
  {
    id: "c3",
    label: "Recurrent BCC · ear",
    sizeX: 18,
    sizeY: 14,
    recurrent: true,
    aggressive: true,
    zone: "1",
    unit: "EAR",
    type: "1",
  },
  {
    id: "c4",
    label: "SCC · temple",
    sizeX: 30,
    sizeY: 22,
    recurrent: false,
    aggressive: true,
    zone: "1",
    unit: "TEMPLE",
    type: "2",
  },
  {
    id: "c5",
    label: "BCC · forehead",
    sizeX: 8,
    sizeY: 7,
    recurrent: false,
    aggressive: false,
    zone: "2",
    unit: "EYEBROW",
    type: "1",
  },
];

export function OrScheduler() {
  const [rooms, setRooms] = useState(3);
  const [cases, setCases] = useState<DayCase[]>(STARTER_CASES);

  const scheduled: ScheduledCase[] = useMemo(() => {
    return cases.map((c) => {
      const p = predict({
        ...DEFAULT_PATIENT,
        Tumour_Size_X: c.sizeX,
        Tumour_Size_Y: c.sizeY,
        Recurrent: c.recurrent ? "1" : "0",
        Aggressive_Histopathology: c.aggressive ? "1" : "0",
        Body_Zone: c.zone,
        Unit: c.unit,
        Tumour_Stats: c.type,
      });
      return {
        id: c.id,
        label: c.label,
        probabilityGe13: p.probability,
        stages: estimateStages(p.probability, p.tumourAreaCm2),
      };
    });
  }, [cases]);

  const schedN = useMemo(() => simulateDay(scheduled, rooms), [scheduled, rooms]);
  const sched1 = useMemo(() => simulateDay(scheduled, 1), [scheduled]);

  const saveMin = sched1.dayEndMin - schedN.dayEndMin;
  const savePct =
    sched1.dayEndMin > 0 ? (saveMin / sched1.dayEndMin) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* controls */}
      <div className="grid gap-4 rounded-xl border border-border/60 bg-card/40 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Operating rooms
          </p>
          <p className="mt-1 font-mono text-3xl tabular-nums text-primary">
            {rooms}
          </p>
        </div>
        <div className="pl-4">
          <Slider
            min={1}
            max={6}
            step={1}
            value={[rooms]}
            onValueChange={(v) => setRooms(Array.isArray(v) ? v[0] ?? 3 : v)}
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 justify-self-end">
          <button
            type="button"
            onClick={() => setCases(STARTER_CASES)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:border-border/80 hover:text-foreground"
          >
            <Shuffle className="mr-1 inline h-3 w-3" /> Reset list
          </button>
        </div>
      </div>

      {/* day summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi
          label="Day ends"
          value={formatWallClock(schedN.dayEndMin)}
          sub={`${Math.round(schedN.dayEndMin)} min total`}
          tone="primary"
        />
        <Kpi
          label="Surgeon utilisation"
          value={`${(schedN.utilisation * 100).toFixed(0)}%`}
          sub={`${Math.round(schedN.surgeonBusyMin)} active min`}
          tone="accent"
        />
        <Kpi
          label="Stages / cases"
          value={`${schedN.totalStages} / ${schedN.caseCount}`}
          sub="predicted from the model"
        />
        <Kpi
          label="Saved vs 1 room"
          value={`${Math.round(saveMin)} min`}
          sub={`${savePct.toFixed(0)}% faster`}
          tone={saveMin > 0 ? "accent" : "foreground"}
        />
      </div>

      {/* Gantt */}
      <Gantt rooms={rooms} result={schedN} />

      {/* Case list */}
      <CaseListEditor
        cases={cases}
        scheduled={scheduled}
        onChange={setCases}
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/40 bg-muted/10 px-4 py-3 text-[11px] text-muted-foreground">
        {(Object.entries(SCHEDULER_PHASE_META) as [Phase, (typeof SCHEDULER_PHASE_META)[Phase]][]).map(
          ([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={cn("inline-block h-2 w-3 rounded-sm", v.color)} />
              {v.label}
            </span>
          ),
        )}
        <span className="ml-auto">
          Model: 25 min excision · 40 min pathology wait · 5 min read · 30 min closure.
        </span>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = "foreground",
}: {
  label: string;
  value: string;
  sub?: string;
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
      {sub && (
        <p className="mt-1 text-[10px] text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

function Gantt({
  rooms,
  result,
}: {
  rooms: number;
  result: ReturnType<typeof simulateDay>;
}) {
  const widthMin = Math.max(result.dayEndMin, 120);
  const pxPerMin = 1.6;
  const caseColors = buildCaseColors(result.activities);

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40 p-4">
      <div
        className="relative"
        style={{ width: `${widthMin * pxPerMin + 60}px` }}
      >
        {/* time axis */}
        <div className="relative h-6 border-b border-border/60">
          {timeTicks(widthMin).map((t) => (
            <div
              key={t}
              className="absolute top-0 h-full border-l border-border/50"
              style={{ left: `${60 + t * pxPerMin}px` }}
            >
              <span className="absolute -top-[2px] pl-1 font-mono text-[10px] text-muted-foreground">
                {formatWallClock(t)}
              </span>
            </div>
          ))}
        </div>

        {/* rooms */}
        <div className="relative">
          {Array.from({ length: rooms }, (_, r) => (
            <div
              key={r}
              className="relative flex h-11 items-center border-b border-border/40 last:border-b-0"
            >
              <div className="absolute left-0 w-14 pr-2 text-right font-mono text-[11px] text-muted-foreground">
                Room {r + 1}
              </div>
              {result.activities
                .filter((a) => a.room === r)
                .map((a, i) => {
                  const meta = SCHEDULER_PHASE_META[a.phase];
                  const accent = caseColors.get(a.caseId) ?? "bg-primary";
                  const isSurgeon = a.phase !== "pathology";
                  return (
                    <motion.div
                      key={`${r}-${i}`}
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{
                        duration: 0.35,
                        delay: Math.min(i * 0.01, 0.5),
                      }}
                      style={{
                        left: `${60 + a.startMin * pxPerMin}px`,
                        width: `${Math.max((a.endMin - a.startMin) * pxPerMin, 2)}px`,
                        transformOrigin: "left",
                      }}
                      className={cn(
                        "absolute top-1 bottom-1 rounded-sm px-1 py-0.5 text-[10px]",
                        meta.color,
                        a.phase === "pathology"
                          ? "border border-dashed border-border/80 bg-transparent"
                          : `${accent} text-background`,
                      )}
                      title={`${a.caseLabel} · ${meta.label} · ${Math.round(a.endMin - a.startMin)} min`}
                    >
                      <span className="truncate">
                        {isSurgeon ? meta.label : "path wait"}
                      </span>
                    </motion.div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildCaseColors(activities: { caseId: string }[]) {
  const colors = [
    "bg-chart-1",
    "bg-chart-2",
    "bg-chart-3",
    "bg-chart-4",
    "bg-chart-5",
    "bg-primary",
    "bg-accent",
  ];
  const ids = Array.from(new Set(activities.map((a) => a.caseId)));
  const map = new Map<string, string>();
  ids.forEach((id, i) => map.set(id, colors[i % colors.length]));
  return map;
}

function timeTicks(widthMin: number): number[] {
  const step = widthMin < 240 ? 30 : 60;
  const ticks: number[] = [];
  for (let t = 0; t <= widthMin; t += step) ticks.push(t);
  return ticks;
}

function CaseListEditor({
  cases,
  scheduled,
  onChange,
}: {
  cases: DayCase[];
  scheduled: ScheduledCase[];
  onChange: (cs: DayCase[]) => void;
}) {
  const [draft, setDraft] = useState<Partial<DayCase>>({
    label: "New case",
    sizeX: 10,
    sizeY: 8,
    zone: "1",
    unit: "NOSE",
    type: "1",
  });

  const addCase = () => {
    const id = `c${Date.now().toString(36)}`;
    onChange([
      ...cases,
      {
        id,
        label: draft.label || "New case",
        sizeX: draft.sizeX ?? 10,
        sizeY: draft.sizeY ?? 8,
        recurrent: draft.recurrent ?? false,
        aggressive: draft.aggressive ?? false,
        zone: (draft.zone ?? "1") as PatientInput["Body_Zone"],
        unit: draft.unit ?? "NOSE",
        type: (draft.type ?? "1") as PatientInput["Tumour_Stats"],
      },
    ]);
  };

  const remove = (id: string) => onChange(cases.filter((c) => c.id !== id));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Today's case list</h3>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-2 font-medium">Case</th>
              <th className="px-4 py-2 font-medium">Size (mm)</th>
              <th className="px-4 py-2 font-medium">Factors</th>
              <th className="px-4 py-2 text-right font-medium">P(≥13)</th>
              <th className="px-4 py-2 text-right font-medium">Stages</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {cases.map((c, idx) => {
              const s = scheduled[idx];
              return (
                <tr
                  key={c.id}
                  className="border-b border-border/30 last:border-b-0"
                >
                  <td className="px-4 py-2">{c.label}</td>
                  <td className="px-4 py-2 font-mono tabular-nums text-foreground/80">
                    {c.sizeX}×{c.sizeY}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.recurrent && (
                        <Badge variant="outline" className="text-[10px]">
                          recurrent
                        </Badge>
                      )}
                      {c.aggressive && (
                        <Badge variant="outline" className="text-[10px]">
                          aggressive
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {c.unit}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground/80">
                    {(s.probabilityGe13 * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground">
                    {s.stages}
                  </td>
                  <td className="px-2">
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      aria-label={`Remove ${c.label}`}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/20 p-3">
        <p className="mb-2 text-xs text-muted-foreground">Add a case</p>
        <div className="grid gap-2 sm:grid-cols-5">
          <input
            type="text"
            value={draft.label ?? ""}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            placeholder="Label"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            value={draft.sizeX ?? 10}
            onChange={(e) =>
              setDraft({ ...draft, sizeX: Number(e.target.value) })
            }
            placeholder="Size X (mm)"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            value={draft.sizeY ?? 8}
            onChange={(e) =>
              setDraft({ ...draft, sizeY: Number(e.target.value) })
            }
            placeholder="Size Y (mm)"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <div className="flex items-center gap-2 text-xs">
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={draft.recurrent ?? false}
                onChange={(e) =>
                  setDraft({ ...draft, recurrent: e.target.checked })
                }
              />
              Recurrent
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={draft.aggressive ?? false}
                onChange={(e) =>
                  setDraft({ ...draft, aggressive: e.target.checked })
                }
              />
              Aggressive
            </label>
          </div>
          <button
            type="button"
            onClick={addCase}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary transition hover:bg-primary/20"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
