/** Coach UI helpers: DB stores seconds; forms use h/m/s and min/sec per km. */

export function secondsToHmsParts(totalSec: number): { h: string; m: string; s: string } {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return { h: "", m: "", s: "" };
  const t = Math.floor(totalSec);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return { h: h > 0 ? String(h) : "", m: String(m), s: String(s) };
}

export function hmsPartsToSeconds(h: string, m: string, s: string): number | null {
  const hi = parseInt(String(h).trim(), 10) || 0;
  const mi = parseInt(String(m).trim(), 10) || 0;
  const si = parseInt(String(s).trim(), 10) || 0;
  if (hi < 0 || mi < 0 || si < 0 || si > 59) return null;
  const t = hi * 3600 + mi * 60 + si;
  return t > 0 ? t : null;
}

export function secondsPerKmToMinSecParts(secPerKm: number): { min: string; sec: string } {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return { min: "", sec: "" };
  const t = Math.round(secPerKm);
  const min = Math.floor(t / 60);
  const sec = t % 60;
  return { min: String(min), sec: String(sec) };
}

export function minSecPartsToSecondsPerKm(minStr: string, secStr: string): number | null {
  const min = parseInt(String(minStr).trim(), 10);
  const sec = parseInt(String(secStr).trim(), 10);
  if (!Number.isFinite(min) || min < 0) return null;
  if (!Number.isFinite(sec) || sec < 0 || sec > 59) return null; // fractional minutes → use min field only
  const t = min * 60 + sec;
  return t > 0 ? t : null;
}

/** e.g. 210 → 3'30"/km */
export function formatPaceMinSecPerKm(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return "—";
  const t = Math.round(secPerKm);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}'${s.toString().padStart(2, "0")}"/km`;
}

export function formatDurationFromSeconds(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) return "—";
  const t = Math.floor(totalSec);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
