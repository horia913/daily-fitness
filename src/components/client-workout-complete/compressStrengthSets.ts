import type { SetGroup } from "./types";

export type CompressLine = {
  setIndex: number;
  reps: number;
  weight: number;
  isPR?: boolean;
};

export function compressSets(lines: CompressLine[]): SetGroup[] {
  const groups: SetGroup[] = [];
  for (const line of lines) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.reps === line.reps &&
      last.weight === line.weight
    ) {
      last.range.end = line.setIndex;
      last.count++;
      if (line.isPR) last.containsPR = true;
    } else {
      groups.push({
        range: { start: line.setIndex, end: line.setIndex },
        reps: line.reps,
        weight: line.weight,
        count: 1,
        containsPR: Boolean(line.isPR),
      });
    }
  }
  return groups;
}

/** Highest weight among lines; ties pick last occurrence index for "top" story. */
export function maxWeightInLines(lines: CompressLine[]): number {
  let m = 0;
  for (const l of lines) {
    if (Number.isFinite(l.weight) && l.weight > m) m = l.weight;
  }
  return m;
}
