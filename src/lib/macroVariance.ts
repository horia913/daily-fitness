/**
 * Macro bar colour = variance from target (v4 §2.9 / Fuel hub).
 * Not coloured by macro identity (P/C/F).
 */

export type MacroVarianceBand = "on" | "near" | "off";

/**
 * on 95–105% · near 80–94% or 105–115% · off otherwise.
 */
export function macroVarianceBand(
  current: number,
  goal: number,
): MacroVarianceBand {
  if (!(goal > 0) || !Number.isFinite(goal)) {
    return current > 0 ? "off" : "on";
  }
  const pct = (Number(current) / goal) * 100;
  if (!Number.isFinite(pct)) return "off";
  if (pct >= 95 && pct <= 105) return "on";
  if ((pct >= 80 && pct < 95) || (pct > 105 && pct <= 115)) return "near";
  return "off";
}
