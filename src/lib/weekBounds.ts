/**
 * Strict Mon–Sun calendar week in a client IANA timezone (UTC instants + local YMD range).
 * Used by athlete score v2 and weekly surfaces that must align with the client's week.
 */

import {
  addCalendarDaysYmd,
  mondayYmdOfZonedWeekContaining,
  normalizeClientTimezone,
  zonedDayInclusiveUtcBounds,
} from "@/lib/clientZonedCalendar";

export type ClientWeekBounds = {
  /** Monday 00:00:00.000 in `timeZone`, as ISO UTC */
  weekStartUtcIso: string;
  /** Sunday 23:59:59.999 in `timeZone`, as ISO UTC */
  weekEndUtcIso: string;
  /** Monday calendar date YYYY-MM-DD in `timeZone` */
  mondayYmd: string;
  /** Sunday calendar date YYYY-MM-DD in `timeZone` */
  sundayYmd: string;
  timeZone: string;
};

/**
 * Current calendar week (Mon–Sun) containing `now`, interpreted in `clientTimeZone`.
 */
export function getCurrentWeekBoundsForClient(
  clientTimeZone: string | null | undefined,
  now: Date = new Date()
): ClientWeekBounds {
  const timeZone = normalizeClientTimezone(clientTimeZone);
  const mondayYmd = mondayYmdOfZonedWeekContaining(now, timeZone);
  const sundayYmd = addCalendarDaysYmd(mondayYmd, 6);
  const { startIso: weekStartUtcIso } = zonedDayInclusiveUtcBounds(mondayYmd, timeZone);
  const { endIso: weekEndUtcIso } = zonedDayInclusiveUtcBounds(sundayYmd, timeZone);
  return {
    weekStartUtcIso,
    weekEndUtcIso,
    mondayYmd,
    sundayYmd,
    timeZone,
  };
}
