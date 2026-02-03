/**
 * Period boundaries in UTC for metrics (metric contract).
 * "This week" = ISO week Mon–Sun; "this month" = calendar month.
 */

export type PeriodKind = 'this_week' | 'this_month' | 'last_7_days' | 'last_4_weeks'

export interface PeriodBounds {
  start: string // ISO
  end: string   // ISO
  weeksInPeriod: number
}

/**
 * Get period start/end in UTC. End is exclusive (next day 00:00) for consistent SQL.
 */
export function getPeriodBounds(kind: PeriodKind, asOf: Date = new Date()): PeriodBounds {
  const toISO = (d: Date) => d.toISOString()
  let start: Date
  let end: Date
  let weeksInPeriod: number

  switch (kind) {
    case 'this_week': {
      // ISO week: Monday = 0
      const day = asOf.getUTCDay()
      const diffToMonday = day === 0 ? -6 : 1 - day
      start = new Date(asOf)
      start.setUTCDate(asOf.getUTCDate() + diffToMonday)
      start.setUTCHours(0, 0, 0, 0)
      end = new Date(start)
      end.setUTCDate(start.getUTCDate() + 7)
      weeksInPeriod = 1
      break
    }
    case 'this_month': {
      start = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1))
      end = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() + 1, 1))
      weeksInPeriod = (end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)
      break
    }
    case 'last_7_days': {
      end = new Date(asOf)
      end.setUTCHours(23, 59, 59, 999)
      start = new Date(end)
      start.setUTCDate(start.getUTCDate() - 6)
      start.setUTCHours(0, 0, 0, 0)
      weeksInPeriod = 1
      break
    }
    case 'last_4_weeks': {
      end = new Date(asOf)
      end.setUTCHours(23, 59, 59, 999)
      start = new Date(end)
      start.setUTCDate(start.getUTCDate() - 7 * 4 + 1)
      start.setUTCHours(0, 0, 0, 0)
      weeksInPeriod = 4
      break
    }
    default:
      start = new Date(asOf)
      end = new Date(asOf)
      weeksInPeriod = 1
  }

  return {
    start: toISO(start),
    end: toISO(end),
    weeksInPeriod
  }
}

/** Days in period (for compliance denominators). */
export function getDaysInPeriod(kind: PeriodKind, asOf: Date = new Date()): number {
  const { start, end } = getPeriodBounds(kind, asOf)
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return Math.ceil((e - s) / (24 * 60 * 60 * 1000))
}
