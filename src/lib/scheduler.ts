/**
 * Multi-room Mohs OR day simulator.
 *
 * Models the four phases of a single stage:
 *   excision  → 25 min (surgeon + room busy)
 *   pathology → 40 min (room busy, surgeon free — the parallelism window)
 *   read slide → 5 min (surgeon + room busy)
 * Closure at the end of the last stage: 30 min (surgeon + room busy).
 *
 * The simulator assigns cases to rooms cyclically, prefers taller (more-stage)
 * cases first for better packing, and hops the surgeon between rooms during
 * pathology waits — which is exactly how Mohs surgeons actually work.
 */

export type Phase = "excision" | "pathology" | "read" | "closure";

export type ScheduledCase = {
  id: string;
  label: string;
  stages: number;
  probabilityGe13: number;
};

export type Activity = {
  caseId: string;
  caseLabel: string;
  phase: Phase;
  startMin: number;
  endMin: number;
  room: number;
  stageIndex: number;
};

export type ScheduleResult = {
  activities: Activity[];
  dayEndMin: number;
  surgeonBusyMin: number;
  surgeonIdleMin: number;
  utilisation: number;
  caseCount: number;
  totalStages: number;
};

const EXCISION_MIN = 25;
const PATHOLOGY_MIN = 40;
const READ_MIN = 5;
const CLOSURE_MIN = 30;

type InFlight = {
  case: ScheduledCase;
  stagesDone: number;
  currentPhase: "pathology-wait"; // room busy, surgeon free; ready at `readyAt`
  readyAt: number;
};

export function simulateDay(
  cases: ScheduledCase[],
  rooms: number,
  dayStart = 0,
): ScheduleResult {
  if (cases.length === 0) {
    return {
      activities: [],
      dayEndMin: dayStart,
      surgeonBusyMin: 0,
      surgeonIdleMin: 0,
      utilisation: 1,
      caseCount: 0,
      totalStages: 0,
    };
  }

  const queue = [...cases].sort((a, b) => b.stages - a.stages);
  const active = new Map<number, InFlight>();
  const activities: Activity[] = [];
  let surgeonFreeAt = dayStart;
  const roomFreeAt = new Array(rooms).fill(dayStart);

  const startCaseInRoom = (r: number, c: ScheduledCase, now: number) => {
    // first excision
    const excisionStart = Math.max(now, surgeonFreeAt, roomFreeAt[r]);
    const excisionEnd = excisionStart + EXCISION_MIN;
    activities.push({
      caseId: c.id,
      caseLabel: c.label,
      phase: "excision",
      startMin: excisionStart,
      endMin: excisionEnd,
      room: r,
      stageIndex: 1,
    });
    // pathology window (surgeon free, room busy)
    const pathologyEnd = excisionEnd + PATHOLOGY_MIN;
    activities.push({
      caseId: c.id,
      caseLabel: c.label,
      phase: "pathology",
      startMin: excisionEnd,
      endMin: pathologyEnd,
      room: r,
      stageIndex: 1,
    });
    surgeonFreeAt = excisionEnd;
    roomFreeAt[r] = pathologyEnd;
    active.set(r, {
      case: c,
      stagesDone: 0, // will be incremented after 'read'
      currentPhase: "pathology-wait",
      readyAt: pathologyEnd,
    });
  };

  // Seed rooms
  let cursor = dayStart;
  for (let r = 0; r < rooms && queue.length > 0; r++) {
    const c = queue.shift()!;
    startCaseInRoom(r, c, cursor);
  }

  // Main loop: at each step, find the earliest thing the surgeon can do
  while (active.size > 0 || queue.length > 0) {
    // Candidate 1: read a slide for any active room (readyAt)
    type Candidate = { kind: "read" | "start"; room: number; at: number };
    const candidates: Candidate[] = [];
    for (const [r, st] of active) {
      candidates.push({
        kind: "read",
        room: r,
        at: Math.max(st.readyAt, surgeonFreeAt),
      });
    }
    // Candidate 2: start a new case in any free room
    if (queue.length > 0) {
      for (let r = 0; r < rooms; r++) {
        if (!active.has(r)) {
          candidates.push({
            kind: "start",
            room: r,
            at: Math.max(roomFreeAt[r], surgeonFreeAt),
          });
        }
      }
    }
    if (candidates.length === 0) break;
    candidates.sort((a, b) => a.at - b.at);
    const next = candidates[0];

    if (next.kind === "start") {
      const c = queue.shift()!;
      startCaseInRoom(next.room, c, next.at);
      continue;
    }

    // Handle "read" for the selected room
    const r = next.room;
    const st = active.get(r)!;
    const readStart = Math.max(st.readyAt, surgeonFreeAt);
    const readEnd = readStart + READ_MIN;
    activities.push({
      caseId: st.case.id,
      caseLabel: st.case.label,
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
      // closure
      const closureEnd = readEnd + CLOSURE_MIN;
      activities.push({
        caseId: st.case.id,
        caseLabel: st.case.label,
        phase: "closure",
        startMin: readEnd,
        endMin: closureEnd,
        room: r,
        stageIndex: st.stagesDone,
      });
      surgeonFreeAt = closureEnd;
      roomFreeAt[r] = closureEnd;
      active.delete(r);
    } else {
      // next stage: excision + pathology
      const excisionEnd = readEnd + EXCISION_MIN;
      activities.push({
        caseId: st.case.id,
        caseLabel: st.case.label,
        phase: "excision",
        startMin: readEnd,
        endMin: excisionEnd,
        room: r,
        stageIndex: st.stagesDone + 1,
      });
      const pathologyEnd = excisionEnd + PATHOLOGY_MIN;
      activities.push({
        caseId: st.case.id,
        caseLabel: st.case.label,
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
  };
}

/**
 * Derive a reasonable stage estimate from the LR model output.
 * Works as a deterministic function of (probability, tumour area).
 */
export function estimateStages(prob: number, tumourAreaCm2: number): number {
  const base = 2 + 2.2 * prob + 0.05 * Math.max(tumourAreaCm2, 0);
  return Math.max(1, Math.min(6, Math.round(base)));
}

/** Format minutes-from-start as a wall-clock string (09:00-ish). */
export function formatWallClock(min: number, dayStartHour = 8): string {
  const total = dayStartHour * 60 + min;
  const h = Math.floor(total / 60) % 24;
  const m = Math.round(total % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const SCHEDULER_PHASE_META: Record<Phase, { label: string; color: string; textColor: string }> = {
  excision: { label: "Excision", color: "bg-destructive", textColor: "text-destructive" },
  pathology: { label: "Pathology", color: "bg-muted", textColor: "text-muted-foreground" },
  read: { label: "Read", color: "bg-accent", textColor: "text-accent" },
  closure: { label: "Closure", color: "bg-primary", textColor: "text-primary" },
};
