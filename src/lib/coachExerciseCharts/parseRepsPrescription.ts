/**
 * Classify prescribed reps strings and test whether logged reps met them.
 * Spec buckets: integer | range | per-side | time | junk | empty.
 */

export type RepsPrescriptionBucket =
  | "integer"
  | "range"
  | "per_side"
  | "time"
  | "junk"
  | "empty";

export type ParsedRepsPrescription = {
  bucket: RepsPrescriptionBucket;
  /** Target for denominator (max of range, exact int, or per-side count). Null if excluded. */
  targetReps: number | null;
  min: number | null;
  max: number | null;
  raw: string;
};

const JUNK_EXACT = new Set(["99"]);

export function classifyRepsPrescription(
  raw: string | number | null | undefined,
): ParsedRepsPrescription {
  if (raw === null || raw === undefined) {
    return { bucket: "empty", targetReps: null, min: null, max: null, raw: "" };
  }
  const s = String(raw).trim();
  if (!s || s === "-") {
    return { bucket: "empty", targetReps: null, min: null, max: null, raw: s };
  }

  const lower = s.toLowerCase();

  // Time-based — exclude from reps adherence
  if (
    /\d+\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes)\b/i.test(s) ||
    /\b(sec|second|min|minute)s?\b/i.test(lower)
  ) {
    return { bucket: "time", targetReps: null, min: null, max: null, raw: s };
  }

  // Per-side: "5 each", "8/side", "10 per side"
  const eachMatch =
    /^(\d+)\s*(each|\/\s*side|per\s*side|ea\.?|\/ea)\b/i.exec(s) ||
    /^(\d+)\s*x\s*2\b/i.exec(s);
  if (eachMatch) {
    const n = parseInt(eachMatch[1]!, 10);
    if (Number.isFinite(n) && n > 0 && n < 90) {
      return { bucket: "per_side", targetReps: n, min: n, max: n, raw: s };
    }
  }

  // Range: "6-8", "10–12"
  const rangeMatch = /^(\d+)\s*[-–—]\s*(\d+)$/.exec(s);
  if (rangeMatch) {
    const a = parseInt(rangeMatch[1]!, 10);
    const b = parseInt(rangeMatch[2]!, 10);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0 && a <= b && b < 90) {
      return {
        bucket: "range",
        targetReps: b,
        min: a,
        max: b,
        raw: s,
      };
    }
  }

  // Plain integer
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (JUNK_EXACT.has(s) || n >= 90) {
      return { bucket: "junk", targetReps: null, min: null, max: null, raw: s };
    }
    if (n > 0) {
      return { bucket: "integer", targetReps: n, min: n, max: n, raw: s };
    }
  }

  // Unparseable → treat as junk/excluded
  return { bucket: "junk", targetReps: null, min: null, max: null, raw: s };
}

/** Whether logged reps meet the prescription (countable buckets only). */
export function repsMeetPrescription(
  loggedReps: number | null | undefined,
  parsed: ParsedRepsPrescription,
): boolean {
  if (parsed.targetReps == null || parsed.min == null || parsed.max == null) {
    return false;
  }
  if (loggedReps == null || !Number.isFinite(loggedReps) || loggedReps <= 0) {
    return false;
  }
  const r = Math.floor(loggedReps);
  if (parsed.bucket === "range") {
    return r >= parsed.min && r <= parsed.max;
  }
  // integer + per_side: exact match (execution logs one side only for per_side)
  return r === parsed.targetReps;
}

export type RepsBucketCounts = Record<RepsPrescriptionBucket, number>;

export function emptyBucketCounts(): RepsBucketCounts {
  return {
    integer: 0,
    range: 0,
    per_side: 0,
    time: 0,
    junk: 0,
    empty: 0,
  };
}
