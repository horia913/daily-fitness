/**
 * DB column `rir` stores **prescribed RPE** as the literal number to show (e.g. 8 → RPE 8).
 * Do not apply `10 - rir` or any RIR↔RPE conversion.
 */

/** UI label: show the stored value exactly (trimmed), prefixed with "RPE ". */
export function formatPrescribedRpeLabel(
  rirColumnValue: number | string | null | undefined,
): string | null {
  if (rirColumnValue === null || rirColumnValue === undefined) return null;
  const s = String(rirColumnValue).trim();
  if (s === "") return null;
  return `RPE ${s}`;
}
