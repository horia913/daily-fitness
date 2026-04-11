/**
 * Parse prescribed reps for default input + optional range hint (e.g. "8-10" → default 8).
 */
export function parseRepsTarget(raw: string | number | null | undefined): {
  numericDefault: number;
  displayHint: string | null;
} {
  if (raw === null || raw === undefined) {
    return { numericDefault: 0, displayHint: null };
  }

  const s = String(raw).trim();
  if (!s || s === "-") {
    return { numericDefault: 0, displayHint: null };
  }

  const rangeMatch = /^(\d+)\s*[-–]\s*(\d+)$/.exec(s);
  if (rangeMatch) {
    const low = parseInt(rangeMatch[1], 10);
    return {
      numericDefault: Number.isFinite(low) ? low : 0,
      displayHint: s,
    };
  }

  const n = parseInt(s, 10);
  if (Number.isFinite(n)) {
    return { numericDefault: n, displayHint: null };
  }

  return { numericDefault: 0, displayHint: s };
}
