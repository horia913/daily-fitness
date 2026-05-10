/**
 * Parses kg from user input or JSON. Normalizes comma as decimal separator (e.g. "16,25" → 16.25).
 */
export function parseWeightKgInput(
  raw: string | number | null | undefined,
): number {
  if (raw === null || raw === undefined) return NaN;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : NaN;
  }
  const s = String(raw).trim().replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}
