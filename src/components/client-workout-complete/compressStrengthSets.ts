import type { SetGroup } from "./types";

export type CompressLine = {
  setIndex: number;
  reps: number;
  weight: number;
  isPR?: boolean;
  setLogId: string;
  prescribedRir: number | null;
  loggedRpe: number | null;
};

function effortKey(rir: number | null, rpe: number | null): string {
  return `${rir ?? "x"}|${rpe ?? "x"}`;
}

export function compressSets(lines: CompressLine[]): SetGroup[] {
  const groups: SetGroup[] = [];
  for (const line of lines) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.reps === line.reps &&
      last.weight === line.weight &&
      effortKey(last.prescribedRir, last.loggedRpe) ===
        effortKey(line.prescribedRir, line.loggedRpe)
    ) {
      last.range.end = line.setIndex;
      last.count++;
      last.setLogIds.push(line.setLogId);
      if (line.isPR) last.containsPR = true;
    } else {
      groups.push({
        range: { start: line.setIndex, end: line.setIndex },
        reps: line.reps,
        weight: line.weight,
        count: 1,
        containsPR: Boolean(line.isPR),
        setLogIds: [line.setLogId],
        prescribedRir: line.prescribedRir,
        loggedRpe: line.loggedRpe,
      });
    }
  }
  return groups;
}

export function maxWeightInLines(lines: CompressLine[]): number {
  let m = 0;
  for (const l of lines) {
    if (Number.isFinite(l.weight) && l.weight > m) m = l.weight;
  }
  return m;
}
