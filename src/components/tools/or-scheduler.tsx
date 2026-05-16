"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  Download,
  Plus,
  Shuffle,
  Trash2,
  Zap,
} from "lucide-react";
import { track } from "@vercel/analytics";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { predict } from "@/lib/model";
import { DEFAULT_PATIENT, type PatientInput } from "@/lib/model-types";
import {
  ARRIVAL_BUFFER_MIN,
  estimateStages,
  formatHHMM,
  parseHHMM,
  SCHEDULER_PHASE_META,
  simulateDay,
  wallClock,
  type Phase,
  type ScheduledCase,
} from "@/lib/scheduler";

type DayCase = {
  id: string;
  label: string;
  patientName: string;
  mrn: string;
  sizeX: number;
  sizeY: number;
  recurrent: boolean;
  aggressive: boolean;
  zone: PatientInput["Body_Zone"];
  unit: string;
  type: PatientInput["Tumour_Stats"];
  /** HH:MM, optional — "" means 'no constraint / compute suggestion' */
  arrivalTime: string;
  priority: boolean;
};

const STARTER_CASES: DayCase[] = [
  {
    id: "c1",
    label: "BCC · nose",
    patientName: "Margaret Chen",
    mrn: "MRN-10341",
    sizeX: 12,
    sizeY: 10,
    recurrent: false,
    aggressive: false,
    zone: "1",
    unit: "NOSE",
    type: "1",
    arrivalTime: "07:45",
    priority: false,
  },
  {
    id: "c2",
    label: "BCC · cheek",
    patientName: "David Okafor",
    mrn: "MRN-10289",
    sizeX: 22,
    sizeY: 16,
    recurrent: false,
    aggressive: true,
    zone: "2",
    unit: "CHEEK",
    type: "1",
    arrivalTime: "08:15",
    priority: false,
  },
  {
    id: "c3",
    label: "Recurrent BCC · ear",
    patientName: "Helen Whitmore",
    mrn: "MRN-10412",
    sizeX: 18,
    sizeY: 14,
    recurrent: true,
    aggressive: true,
    zone: "1",
    unit: "EAR",
    type: "1",
    arrivalTime: "08:30",
    priority: true,
  },
  {
    id: "c4",
    label: "SCC · temple",
    patientName: "Raj Patel",
    mrn: "MRN-10502",
    sizeX: 30,
    sizeY: 22,
    recurrent: false,
    aggressive: true,
    zone: "1",
    unit: "TEMPLE",
    type: "2",
    arrivalTime: "09:00",
    priority: false,
  },
  {
    id: "c5",
    label: "BCC · forehead",
    patientName: "Sandra Lau",
    mrn: "MRN-10167",
    sizeX: 8,
    sizeY: 7,
    recurrent: false,
    aggressive: false,
    zone: "2",
    unit: "EYEBROW",
    type: "1",
    arrivalTime: "",
    priority: false,
  },
];

export function OrScheduler() {
  const [rooms, setRooms] = useState(3);
  const [cases, setCases] = useState<DayCase[]>(STARTER_CASES);
  const [dayStartTime, setDayStartTime] = useState("08:00");
  const [targetCloseTime, setTargetCloseTime] = useState("17:00");
  const [lunchEnabled, setLunchEnabled] = useState(true);
  const [lunchStartTime, setLunchStartTime] = useState("12:30");
  const [lunchEndTime, setLunchEndTime] = useState("13:00");

  const dayStartMin = parseHHMM(dayStartTime);
  const targetCloseMin = parseHHMM(targetCloseTime);
  const lunchStartOffset = lunchEnabled ? parseHHMM(lunchStartTime) - dayStartMin : null;
  const lunchEndOffset = lunchEnabled ? parseHHMM(lunchEndTime) - dayStartMin : null;

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
      const arrivalMin = c.arrivalTime
        ? Math.max(0, parseHHMM(c.arrivalTime) - dayStartMin)
        : undefined;
      return {
        id: c.id,
        label: c.label,
        patientName: c.patientName,
        mrn: c.mrn,
        probabilityGe13: p.probability,
        stages: estimateStages(p.probability, p.tumourAreaCm2),
        arrivalMin,
        priority: c.priority,
      };
    });
  }, [cases, dayStartMin]);

  const schedN = useMemo(
    () =>
      simulateDay(scheduled, {
        rooms,
        dayStart: 0,
        lunchStart: lunchStartOffset,
        lunchEnd: lunchEndOffset,
      }),
    [scheduled, rooms, lunchStartOffset, lunchEndOffset],
  );
  const sched1 = useMemo(
    () =>
      simulateDay(scheduled, {
        rooms: 1,
        dayStart: 0,
        lunchStart: lunchStartOffset,
        lunchEnd: lunchEndOffset,
      }),
    [scheduled, lunchStartOffset, lunchEndOffset],
  );

  const saveMin = Math.max(0, sched1.dayEndMin - schedN.dayEndMin);
  const savePct =
    sched1.dayEndMin > 0 ? (saveMin / sched1.dayEndMin) * 100 : 0;

  const dayEndWallMin = dayStartMin + schedN.dayEndMin;
  const overflowMin = Math.max(0, dayEndWallMin - targetCloseMin);

  // Apply suggested arrival times to the case list
  const applySuggestedArrivals = () => {
    const suggestions = new Map<string, number | null>();
    for (const pc of schedN.perCase) {
      suggestions.set(pc.id, pc.suggestedArrivalMin);
    }
    setCases((prev) =>
      prev.map((c) => {
        const sugg = suggestions.get(c.id);
        if (sugg == null) return c;
        return { ...c, arrivalTime: formatHHMM(dayStartMin + sugg) };
      }),
    );
  };

  const exportCsv = () => {
    track("scheduler_csv_export", { rooms, cases: cases.length });
    const rows = ["Room,Start,End,Patient,MRN,Case,Stages,P(≥13),Arrival,Wait (min)"];
    for (const pc of schedN.perCase) {
      const c = cases.find((x) => x.id === pc.id);
      const start =
        pc.scheduledStartMin != null
          ? wallClock(pc.scheduledStartMin, dayStartMin)
          : "";
      const end =
        pc.scheduledEndMin != null
          ? wallClock(pc.scheduledEndMin, dayStartMin)
          : "";
      const arrival = c?.arrivalTime ?? "";
      const wait = pc.waitMin != null ? String(pc.waitMin) : "";
      const prob = scheduled.find((s) => s.id === pc.id)?.probabilityGe13 ?? 0;
      rows.push(
        [
          pc.assignedRoom != null ? `Room ${pc.assignedRoom + 1}` : "",
          start,
          end,
          csvCell(pc.patientName ?? ""),
          csvCell(pc.mrn ?? ""),
          csvCell(pc.label),
          String(pc.stages),
          `${(prob * 100).toFixed(1)}%`,
          arrival,
          wait,
        ].join(","),
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mohs-day-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* day config row */}
      <div className="grid gap-4 rounded-xl border border-border/60 bg-card/40 p-4 lg:grid-cols-[auto_1fr_auto_auto]">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Procedure rooms
          </p>
          <p className="mt-1 font-mono text-3xl tabular-nums text-primary">
            {rooms}
          </p>
        </div>
        <div className="min-w-0 lg:px-4">
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
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <TimeField
            label="Day start"
            value={dayStartTime}
            onChange={setDayStartTime}
          />
          <TimeField
            label="Target close"
            value={targetCloseTime}
            onChange={setTargetCloseTime}
          />
        </div>
        <div className="flex flex-wrap items-end justify-end gap-2">
          <button
            type="button"
            onClick={applySuggestedArrivals}
            title="Fill in arrival times as start − 15 min"
            className="rounded-md border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs text-accent transition hover:bg-accent/20"
          >
            <Clock className="mr-1 inline h-3 w-3" /> Suggest arrivals
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:border-border/80 hover:text-foreground"
          >
            <Download className="mr-1 inline h-3 w-3" /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => setCases(STARTER_CASES)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:border-border/80 hover:text-foreground"
          >
            <Shuffle className="mr-1 inline h-3 w-3" /> Reset
          </button>
        </div>
      </div>

      {/* lunch row */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/60 bg-card/40 px-4 py-2 text-xs">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={lunchEnabled}
            onChange={(e) => setLunchEnabled(e.target.checked)}
          />
          <span className="text-muted-foreground">Surgeon lunch break</span>
        </label>
        {lunchEnabled && (
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={lunchStartTime}
              onChange={(e) => setLunchStartTime(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs tabular-nums"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="time"
              value={lunchEndTime}
              onChange={(e) => setLunchEndTime(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs tabular-nums"
            />
          </div>
        )}
        <span className="ml-auto text-muted-foreground">
          Excision / closure can't start if it would run into the break.
        </span>
      </div>

      {/* day summary */}
      <div className="grid gap-3 md:grid-cols-4">
        <Kpi
          label="Day ends"
          value={formatHHMM(dayEndWallMin)}
          sub={`${Math.round(schedN.dayEndMin)} min elapsed`}
          tone={overflowMin > 0 ? "destructive" : "primary"}
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
          sub="model-predicted"
        />
        <Kpi
          label="Saved vs 1 room"
          value={`${Math.round(saveMin)} min`}
          sub={`${savePct.toFixed(0)}% faster`}
          tone={saveMin > 0 ? "accent" : "foreground"}
        />
      </div>

      {overflowMin > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              Schedule finishes {Math.round(overflowMin)} min past target close
              ({targetCloseTime}).
            </p>
            <p className="text-destructive/80">
              Consider adding a room, deferring a non-urgent case, or starting
              earlier.
            </p>
          </div>
        </div>
      )}

      {/* Gantt */}
      <Gantt
        rooms={rooms}
        result={schedN}
        dayStartMin={dayStartMin}
        lunch={
          lunchEnabled && lunchStartOffset != null && lunchEndOffset != null
            ? { start: lunchStartOffset, end: lunchEndOffset }
            : null
        }
      />

      {/* Case list */}
      <CaseListEditor
        cases={cases}
        scheduled={scheduled}
        perCase={schedN.perCase}
        dayStartMin={dayStartMin}
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
        <span className="inline-flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-destructive" />
          Priority case
        </span>
        <span className="ml-auto">
          Model: 25 min excision · 40 min pathology wait · 5 min read · 30 min closure.
        </span>
      </div>
    </div>
  );
}

function csvCell(v: string): string {
  return /[,"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-sm tabular-nums"
      />
    </label>
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
  tone?: "foreground" | "primary" | "accent" | "destructive";
}) {
  const color =
    tone === "primary"
      ? "text-primary"
      : tone === "accent"
        ? "text-accent"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Gantt({
  rooms,
  result,
  dayStartMin,
  lunch,
}: {
  rooms: number;
  result: ReturnType<typeof simulateDay>;
  dayStartMin: number;
  lunch: { start: number; end: number } | null;
}) {
  const widthMin = Math.max(result.dayEndMin + 10, 120);
  const pxPerMin = 1.6;
  const caseColors = buildCaseColors(result.activities);

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40 p-4">
      <div
        className="relative"
        style={{ width: `${widthMin * pxPerMin + 72}px` }}
      >
        {/* time axis */}
        <div className="relative h-6 border-b border-border/60">
          {timeTicks(widthMin).map((t) => (
            <div
              key={t}
              className="absolute top-0 h-full border-l border-border/50"
              style={{ left: `${72 + t * pxPerMin}px` }}
            >
              <span className="absolute -top-[2px] pl-1 font-mono text-[10px] text-muted-foreground">
                {wallClock(t, dayStartMin)}
              </span>
            </div>
          ))}
          {/* lunch shading */}
          {lunch && (
            <div
              className="absolute top-full bg-muted/30"
              style={{
                left: `${72 + lunch.start * pxPerMin}px`,
                width: `${Math.max((lunch.end - lunch.start) * pxPerMin, 2)}px`,
                height: `${rooms * 44 + 4}px`,
              }}
            />
          )}
        </div>

        {/* rooms */}
        <div className="relative">
          {Array.from({ length: rooms }, (_, r) => (
            <div
              key={r}
              className="relative flex h-11 items-center border-b border-border/40 last:border-b-0"
            >
              <div className="absolute left-0 w-16 pr-2 text-right font-mono text-[11px] text-muted-foreground">
                Room {r + 1}
              </div>
              {result.activities
                .filter((a) => a.room === r)
                .map((a, i) => {
                  const meta = SCHEDULER_PHASE_META[a.phase];
                  const accent = caseColors.get(a.caseId) ?? "bg-primary";
                  const isSurgeon = a.phase !== "pathology";
                  const label =
                    a.phase === "pathology"
                      ? "path wait"
                      : `${meta.label}${a.patientName ? ` · ${a.patientName.split(" ")[0]}` : ""}`;
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
                        left: `${72 + a.startMin * pxPerMin}px`,
                        width: `${Math.max((a.endMin - a.startMin) * pxPerMin, 2)}px`,
                        transformOrigin: "left",
                      }}
                      className={cn(
                        "absolute top-1 bottom-1 truncate rounded-sm px-1.5 py-0.5 text-[10px]",
                        meta.color,
                        a.phase === "pathology"
                          ? "border border-dashed border-border/80 bg-transparent text-muted-foreground"
                          : `${accent} text-background`,
                      )}
                      title={`${a.patientName ?? a.caseLabel} · ${meta.label} · ${Math.round(a.endMin - a.startMin)} min${
                        isSurgeon ? "" : " (surgeon free)"
                      }`}
                    >
                      {label}
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
  perCase,
  dayStartMin,
  onChange,
}: {
  cases: DayCase[];
  scheduled: ScheduledCase[];
  perCase: ReturnType<typeof simulateDay>["perCase"];
  dayStartMin: number;
  onChange: (cs: DayCase[]) => void;
}) {
  const [draft, setDraft] = useState<Partial<DayCase>>({
    label: "New case",
    patientName: "",
    mrn: "",
    sizeX: 10,
    sizeY: 8,
    zone: "1",
    unit: "NOSE",
    type: "1",
    arrivalTime: "",
    priority: false,
  });

  const perCaseMap = useMemo(() => {
    const m = new Map<string, (typeof perCase)[number]>();
    for (const p of perCase) m.set(p.id, p);
    return m;
  }, [perCase]);

  const addCase = () => {
    const id = `c${Date.now().toString(36)}`;
    onChange([
      ...cases,
      {
        id,
        label: draft.label || "New case",
        patientName: draft.patientName ?? "",
        mrn: draft.mrn ?? "",
        sizeX: draft.sizeX ?? 10,
        sizeY: draft.sizeY ?? 8,
        recurrent: draft.recurrent ?? false,
        aggressive: draft.aggressive ?? false,
        zone: (draft.zone ?? "1") as PatientInput["Body_Zone"],
        unit: draft.unit ?? "NOSE",
        type: (draft.type ?? "1") as PatientInput["Tumour_Stats"],
        arrivalTime: draft.arrivalTime ?? "",
        priority: draft.priority ?? false,
      },
    ]);
  };

  const remove = (id: string) => onChange(cases.filter((c) => c.id !== id));
  const patch = (id: string, p: Partial<DayCase>) =>
    onChange(cases.map((c) => (c.id === id ? { ...c, ...p } : c)));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Today's case list</h3>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-2 font-medium">Patient / MRN</th>
              <th className="px-3 py-2 font-medium">Case</th>
              <th className="px-3 py-2 text-right font-medium">Size</th>
              <th className="px-3 py-2 font-medium">Flags</th>
              <th className="px-3 py-2 text-right font-medium">P(≥13)</th>
              <th className="px-3 py-2 text-right font-medium">Stages</th>
              <th className="px-3 py-2 text-right font-medium">Arrival</th>
              <th className="px-3 py-2 text-right font-medium">Start</th>
              <th className="px-3 py-2 text-right font-medium">Wait</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {cases.map((c, idx) => {
              const s = scheduled[idx];
              const pc = perCaseMap.get(c.id);
              const startWall =
                pc?.scheduledStartMin != null
                  ? wallClock(pc.scheduledStartMin, dayStartMin)
                  : "—";
              const suggested =
                pc?.suggestedArrivalMin != null
                  ? wallClock(pc.suggestedArrivalMin, dayStartMin)
                  : null;
              const wait = pc?.waitMin;
              return (
                <tr
                  key={c.id}
                  className="border-b border-border/30 last:border-b-0 align-top"
                >
                  <td className="px-3 py-2">
                    <input
                      className="w-40 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-border/60 focus:border-border focus:bg-background"
                      value={c.patientName}
                      onChange={(e) => patch(c.id, { patientName: e.target.value })}
                      placeholder="Patient name"
                    />
                    <input
                      className="mt-0.5 w-40 rounded-md border border-transparent bg-transparent px-1 py-0.5 font-mono text-[11px] text-muted-foreground hover:border-border/60 focus:border-border focus:bg-background"
                      value={c.mrn}
                      onChange={(e) => patch(c.id, { mrn: e.target.value })}
                      placeholder="MRN"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-32 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-border/60 focus:border-border focus:bg-background"
                      value={c.label}
                      onChange={(e) => patch(c.id, { label: e.target.value })}
                    />
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {c.unit}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-foreground/80">
                    {c.sizeX}×{c.sizeY}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <FlagToggle
                        on={c.priority}
                        onClick={() => patch(c.id, { priority: !c.priority })}
                        title="Urgent — schedule first"
                        tone="destructive"
                      >
                        <Zap className="h-3 w-3" /> Priority
                      </FlagToggle>
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
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground/80">
                    {(s.probabilityGe13 * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                    {s.stages}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="time"
                      className="rounded-md border border-transparent bg-transparent px-1 py-0.5 text-right font-mono text-sm tabular-nums hover:border-border/60 focus:border-border focus:bg-background"
                      value={c.arrivalTime}
                      onChange={(e) => patch(c.id, { arrivalTime: e.target.value })}
                    />
                    {!c.arrivalTime && suggested && (
                      <div className="mt-0.5 font-mono text-[10px] text-accent">
                        suggest {suggested}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground/80">
                    {startWall}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {wait == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : wait > 30 ? (
                      <span className="text-destructive">{wait} min</span>
                    ) : wait > 15 ? (
                      <span className="text-accent">{wait} min</span>
                    ) : (
                      <span className="text-foreground/80">{wait} min</span>
                    )}
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
        <div className="grid gap-2 sm:grid-cols-6">
          <input
            type="text"
            value={draft.patientName ?? ""}
            onChange={(e) => setDraft({ ...draft, patientName: e.target.value })}
            placeholder="Patient name"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm sm:col-span-2"
          />
          <input
            type="text"
            value={draft.label ?? ""}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            placeholder="Case label"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            value={draft.sizeX ?? 10}
            onChange={(e) => setDraft({ ...draft, sizeX: Number(e.target.value) })}
            placeholder="X (mm)"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            value={draft.sizeY ?? 8}
            onChange={(e) => setDraft({ ...draft, sizeY: Number(e.target.value) })}
            placeholder="Y (mm)"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="time"
            value={draft.arrivalTime ?? ""}
            onChange={(e) => setDraft({ ...draft, arrivalTime: e.target.value })}
            className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm tabular-nums"
          />
          <div className="flex flex-wrap items-center gap-3 text-xs sm:col-span-5">
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={draft.recurrent ?? false}
                onChange={(e) => setDraft({ ...draft, recurrent: e.target.checked })}
              />
              Recurrent
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={draft.aggressive ?? false}
                onChange={(e) => setDraft({ ...draft, aggressive: e.target.checked })}
              />
              Aggressive
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={draft.priority ?? false}
                onChange={(e) => setDraft({ ...draft, priority: e.target.checked })}
              />
              Priority
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
        <p className="mt-2 text-[10px] text-muted-foreground">
          Leave arrival time empty to see a suggested arrival computed from the
          schedule (= start − {ARRIVAL_BUFFER_MIN} min). Click "Suggest
          arrivals" at the top to fill them all.
        </p>
      </div>
    </div>
  );
}

function FlagToggle({
  on,
  onClick,
  title,
  tone,
  children,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  tone: "destructive";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] transition",
        on
          ? tone === "destructive"
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
