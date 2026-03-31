/**
 * Calendar boundaries in a client's IANA timezone (profiles.timezone).
 * Keeps coach client summary "today" / week dots aligned with the client's local day.
 */

import { midnightInTimezone } from "@/lib/weekComplianceService";

export function normalizeClientTimezone(raw: string | null | undefined): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  return t.length > 0 ? t : "UTC";
}

/** YYYY-MM-DD for the instant `now` in `timeZone`. */
export function zonedCalendarDateString(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addCalendarDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const u = Date.UTC(y, m - 1, d + deltaDays);
  return new Date(u).toISOString().slice(0, 10);
}

/** Monday = 0 … Sunday = 6 for `instant` interpreted in `timeZone`. */
export function weekdayMon0Sun6InTimezone(
  instant: Date,
  timeZone: string
): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || "UTC",
    weekday: "short",
  }).format(instant);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[wd] ?? 0;
}

/** Monday YYYY-MM-DD of the week containing `now` in `timeZone`. */
export function mondayYmdOfZonedWeekContaining(
  now: Date,
  timeZone: string
): string {
  const todayYmd = zonedCalendarDateString(now, timeZone);
  const dow = weekdayMon0Sun6InTimezone(now, timeZone);
  return addCalendarDaysYmd(todayYmd, -dow);
}

/** Inclusive UTC bounds for one calendar day in `timeZone`. */
export function zonedDayInclusiveUtcBounds(
  ymd: string,
  timeZone: string
): { startIso: string; endIso: string } {
  const tz = timeZone || "UTC";
  const startIso = midnightInTimezone(ymd, tz);
  const nextYmd = addCalendarDaysYmd(ymd, 1);
  const nextStartMs = Date.parse(midnightInTimezone(nextYmd, tz));
  const endIso = new Date(nextStartMs - 1).toISOString();
  return { startIso, endIso };
}
