/** Pure scoring helpers for Athlete Score v2 (unit-testable, no I/O). */

export function intensityMultiplier(intensity: string | null | undefined): number {
  switch (intensity) {
    case "vigorous":
      return 2.0;
    case "moderate":
      return 1.5;
    case "light":
      return 1.0;
    default:
      return 1.0;
  }
}

export function computeRepsScore(
  logged: number | null | undefined,
  prescribed: string | null | undefined
): number | null {
  if (logged == null || prescribed == null) return null;
  const p = prescribed.trim();
  if (!p.length) return 1.0;
  if (/AMRAP/i.test(p)) return 1.0;

  const rangeMatch = p.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
  if (rangeMatch) {
    const lo = parseInt(rangeMatch[1], 10);
    const hi = parseInt(rangeMatch[2], 10);
    if (!Number.isFinite(lo) || lo <= 0 || !Number.isFinite(hi) || hi < lo) return null;
    if (logged >= lo && logged <= hi) return 1.0;
    if (logged < lo) return logged / lo;
    return 1.0;
  }

  const numMatch = p.match(/^\s*(\d+)\s*$/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (!Number.isFinite(n) || n === 0) return null;
    return Math.min(1, logged / n);
  }

  return null;
}

export function computeWeightScore(
  logged: number | null | undefined,
  prescribed: number | null | undefined
): number | null {
  if (logged == null || prescribed == null || prescribed === 0) return null;
  return Math.min(1, logged / prescribed);
}

export function computeRpeScore(
  logged: number | null | undefined,
  prescribed: number | null | undefined
): number | null {
  if (logged == null || prescribed == null) return null;
  const drift = Math.abs(Number(logged) - Number(prescribed));
  return 1 - Math.min(1, drift / 3);
}

export function averageNullable(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}
