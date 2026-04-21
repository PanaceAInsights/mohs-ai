/**
 * Multi-room Mohs day simulator.
 *
 * Each Mohs stage has four phases:
 *   excision   → 25 min (surgeon + room busy)
 *   pathology  → 40 min (room busy, surgeon free — the parallelism window)
 *   read slide → 5 min (surgeon + room busy)
 * Closure at the end of the last stage: 30 min (surgeon + room busy).
 *
 * The simulator:
 *   • respects per-case arrival times (excision can't start earlier)
 *   • prioritises flagged urgent cases over packing efficiency
 *   • then sorts by stage count descending so larger cases start first
 *   • honours an optional surgeon lunch break (both rooms and surgeon treat it
 *     as dead time)
 *   • hops the surgeon between rooms during pathology waits
 */

export type Phase = "excision" | "pathology" | "read" | "closure";

export type ScheduledCase = {
  id: string;
  label: string;
  patientName?: string;
  mrn?: string;
  stages: number;
  probabilityGe13: number;
  /** Optional arrival time in minutes from day start. */
  arrivalMin?: number;
  priority?: boolean;
};

export type Activity = {
  caseId: string;
  caseLabel: string;
  patientName?: string;
  phase: Phase;
  startMin: number;
  endMin: number;
  room: number;
  stageIndex: number;
};

export type PerCaseSummary = {
  id: string;
  label: string;
  patientName?: string;
  mrn?: string;
  stages: number;
  scheduledStartMin: number | null;
  scheduledEndMin: number | null;
  suggestedArrivalMin: number | null;
  waitMin: number | null;
  totalInRoomMin: number | null;
  assignedRoom: number | null;
};

export type ScheduleResult = {
  activities: Activity[];
  dayEndMin: number;
  surgeonBusyMin: number;
  surgeonIdleMin: number;
  utilisation: number;
  caseCount: number;
  totalStages: number;
  perCase: PerCaseSummary[];
};

const EXCISION_MIN = 25;
const PATHOLOGY_MIN = 40;
const READ_MIN = 5;
const CLOSURE_MIN = 30;
/** Setup time before excision — patient needs to be present by this many minutes ahead. */
export const ARRIVAL_BUFFER_MIN = 15;

type InFlight = {
  case: ScheduledCase;
  stagesDone: number;
  readyAt: number; // pathology end (surgeon can read)
};

export type SimulateOptions = {
  rooms: number;
  dayStart?: number;
  lunchStart?: number | null; // min-from-dayStart
  lunchEnd?: number | null;
};

export function simulateDay(
  cases: ScheduledCase[],
  opts: SimulateOptions,
): ScheduleResult {
  const rooms = Math.max(1, opts.rooms);
  const dayStart = opts.dayStart ?? 0;
  const lunchStart = opts.lunchStart ?? null;
  const lunchEnd = opts.lunchEnd ?? null;
  const hasLunch =
    lunchStart !== null && lunchEnd !== null && lunchEnd > lunchStart;

  if (cases.length === 0) {
    return {
      activities: [],
      dayEndMin: dayStart,
      surgeonBusyMin: 0,
      surgeonIdleMin: 0,
      utilisation: 1,
      caseCount: 0,
      totalStages: 0,
      perCase: [],
    };
  }

  // Order: priority first, then stages descending (larger cases start earlier)
  const queue = [...cases].sort((a, b) => {
    if ((a.priority ? 1 : 0) !== (b.priority ? 1 : 0)) {
      return b.priority ? 1 : -1;
    }
    return b.stages - a.stages;
  });

  const active = new Map<number, InFlight>();
  const activities: Activity[] = [];
  const perCase = new Map<string, PerCaseSummary>();
  for (const c of cases) {
    perCase.set(c.id, {
      id: c.id,
      label: c.label,
      patientName: c.patientName,
      mrn: c.mrn,
      stages: c.stages,
      scheduledStartMin: null,
      scheduledEndMin: null,
      suggestedArrivalMin: null,
      waitMin: null,
      totalInRoomMin: null,
      assignedRoom: null,
    });
  }

  let surgeonFreeAt = dayStart;
  const roomFreeAt = new Array(rooms).fill(dayStart);

  /** Push both surgeon and a specific room past the lunch window if they land inside it. */
  const nudgePastLunch = (t: number): number => {
    if (hasLunch && t > lunchStart! && t < lunchEnd!) return lunchEnd!;
    return t;
  };

  const startCaseInRoom = (r: number, c: ScheduledCase) => {
    const arrival = c.arrivalMin ?? dayStart;
    // Excision can start no earlier than: arrival, surgeon free, room free, past lunch
    let excisionStart = Math.max(arrival, surgeonFreeAt, roomFreeAt[r]);
    excisionStart = nudgePastLunch(excisionStart);
    if (hasLunch && excisionStart + EXCISION_MIN > lunchStart! && excisionStart < lunchStart!) {
      excisionStart = lunchEnd!;
    }
    const excisionEnd = excisionStart + EXCISION_MIN;

    activities.push({
      caseId: c.id,
      caseLabel: c.label,
      patientName: c.patientName,
      phase: "excision",
      startMin: excisionStart,
      endMin: excisionEnd,
      room: r,
      stageIndex: 1,
    });
    const pathologyEnd = excisionEnd + PATHOLOGY_MIN;
    activities.push({
      caseId: c.id,
      caseLabel: c.label,
      patientName: c.patientName,
      phase: "pathology",
      startMin: excisionEnd,
      endMin: pathologyEnd,
      room: r,
      stageIndex: 1,
    });
    surgeonFreeAt = excisionEnd;
    roomFreeAt[r] = pathologyEnd;
    active.set(r, { case: c, stagesDone: 0, readyAt: pathologyEnd });

    const summary = perCase.get(c.id)!;
    summary.scheduledStartMin = excisionStart;
    summary.assignedRoom = r;
    summary.suggestedArrivalMin = Math.max(
      dayStart,
      excisionStart - ARRIVAL_BUFFER_MIN,
    );
    if (c.arrivalMin != null) {
      summary.waitMin = Math.max(0, excisionStart - c.arrivalMin);
    }
  };

  // Seed initial rooms from the head of the queue
  for (let r = 0; r < rooms && queue.length > 0; r++) {
    const c = queue.shift()!;
    startCaseInRoom(r, c);
  }

  while (active.size > 0 || queue.length > 0) {
    type Candidate = { kind: "read" | "start"; room: number; at: number; case?: ScheduledCase };
    const candidates: Candidate[] = [];

    for (const [r, st] of active) {
      candidates.push({
        kind: "read",
        room: r,
        at: nudgePastLunch(Math.max(st.readyAt, surgeonFreeAt)),
      });
    }
    if (queue.length > 0) {
      for (let r = 0; r < rooms; r++) {
        if (!active.has(r)) {
          const next = queue[0];
          const earliest = Math.max(
            roomFreeAt[r],
            surgeonFreeAt,
            next.arrivalMin ?? dayStart,
          );
          candidates.push({
            kind: "start",
            room: r,
            at: nudgePastLunch(earliest),
            case: next,
          });
        }
      }
    }
    if (candidates.length === 0) break;
    candidates.sort((a, b) => a.at - b.at);
    const next = candidates[0];

    if (next.kind === "start") {
      const c = queue.shift()!;
      startCaseInRoom(next.room, c);
      continue;
    }

    const r = next.room;
    const st = active.get(r)!;
    let readStart = Math.max(st.readyAt, surgeonFreeAt);
    readStart = nudgePastLunch(readStart);
    const readEnd = readStart + READ_MIN;
    activities.push({
      caseId: st.case.id,
      caseLabel: st.case.label,
      patientName: st.case.patientName,
      phase: "read",
      startMin: readStart,
      endMin: readEnd,
      room: r,
      stageIndex: st.stagesDone + 1,
    });
    st.stagesDone += 1;
    surgeonFreeAt = readEnd;
    roomFreeAt[r] = readEnd;

    if (st.stagesDone >= st.case.stages) {
      let closureStart = nudgePastLunch(readEnd);
      // Don't let closure straddle lunch
      if (hasLunch && closureStart < lunchStart! && closureStart + CLOSURE_MIN > lunchStart!) {
        closureStart = lunchEnd!;
      }
      const closureEnd = closureStart + CLOSURE_MIN;
      activities.push({
        caseId: st.case.id,
        caseLabel: st.case.label,
        patientName: st.case.patientName,
        phase: "closure",
        startMin: closureStart,
        endMin: closureEnd,
        room: r,
        stageIndex: st.stagesDone,
      });
      surgeonFreeAt = closureEnd;
      roomFreeAt[r] = closureEnd;
      const summary = perCase.get(st.case.id)!;
      summary.scheduledEndMin = closureEnd;
      if (summary.scheduledStartMin != null) {
        summary.totalInRoomMin = closureEnd - summary.scheduledStartMin;
      }
      active.delete(r);
    } else {
      let excisionStart = nudgePastLunch(readEnd);
      if (hasLunch && excisionStart < lunchStart! && excisionStart + EXCISION_MIN > lunchStart!) {
        excisionStart = lunchEnd!;
      }
      const excisionEnd = excisionStart + EXCISION_MIN;
      activities.push({
        caseId: st.case.id,
        caseLabel: st.case.label,
        patientName: st.case.patientName,
        phase: "excision",
        startMin: excisionStart,
        endMin: excisionEnd,
        room: r,
        stageIndex: st.stagesDone + 1,
      });
      const pathologyEnd = excisionEnd + PATHOLOGY_MIN;
      activities.push({
        caseId: st.case.id,
        caseLabel: st.case.label,
        patientName: st.case.patientName,
        phase: "pathology",
        startMin: excisionEnd,
        endMin: pathologyEnd,
        room: r,
        stageIndex: st.stagesDone + 1,
      });
      surgeonFreeAt = excisionEnd;
      roomFreeAt[r] = pathologyEnd;
      st.readyAt = pathologyEnd;
    }
  }

  const dayEndMin = Math.max(...roomFreeAt, dayStart);
  const surgeonBusyMin = activities
    .filter((a) => a.phase !== "pathology")
    .reduce((acc, a) => acc + (a.endMin - a.startMin), 0);
  const surgeonIdleMin = Math.max(dayEndMin - dayStart - surgeonBusyMin, 0);
  const utilisation =
    dayEndMin > dayStart ? surgeonBusyMin / (dayEndMin - dayStart) : 1;
  const totalStages = cases.reduce((acc, c) => acc + c.stages, 0);

  return {
    activities,
    dayEndMin,
    surgeonBusyMin,
    surgeonIdleMin,
    utilisation,
    caseCount: cases.length,
    totalStages,
    perCase: Array.from(perCase.values()),
  };
}

/** Derive a stage estimate from the LR probability + tumour area. */
export function estimateStages(prob: number, tumourAreaCm2: number): number {
  const base = 2 + 2.2 * prob + 0.05 * Math.max(tumourAreaCm2, 0);
  return Math.max(1, Math.min(6, Math.round(base)));
}

export function parseHHMM(time: string): number {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function formatHHMM(minutesSinceMidnight: number): string {
  const total = ((Math.round(minutesSinceMidnight) % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Convert schedule-internal minutes (0 = day start) to wall clock given the day start. */
export function wallClock(minFromDayStart: number, dayStartMin: number): string {
  return formatHHMM(dayStartMin + minFromDayStart);
}

export const SCHEDULER_PHASE_META: Record<
  Phase,
  { label: string; color: string; textColor: string }
> = {
  excision: { label: "Excision", color: "bg-destructive", textColor: "text-destructive" },
  pathology: { label: "Pathology", color: "bg-muted", textColor: "text-muted-foreground" },
  read: { label: "Read", color: "bg-accent", textColor: "text-accent" },
  closure: { label: "Closure", color: "bg-primary", textColor: "text-primary" },
};
