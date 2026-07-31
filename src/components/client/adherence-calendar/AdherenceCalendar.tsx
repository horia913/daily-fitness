"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toLocalDateString } from "@/lib/clientActivityService";
import styles from "./AdherenceCalendar.module.css";

/** One day of adherence intensity. `value` is 0–1; `null` = nothing scheduled (neutral). */
export type AdherenceCalendarDay = {
  date: string; // YYYY-MM-DD
  value: number | null;
};

export type AdherenceDayVisual =
  | "none"
  | "full"
  | "partial"
  | "missed"
  | "upcoming";

export type AdherenceCalendarProps = {
  /** Days to colour. Missing dates in the visible month render as neutral. */
  days: AdherenceCalendarDay[];
  /** Controlled month (1st of month local). Omit for uncontrolled. */
  month?: Date;
  /** Initial month when uncontrolled. Defaults to current month. */
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  className?: string;
  /** Accessible name for the calendar region. */
  "aria-label"?: string;
  /**
   * `full` — month nav, day numbers, legend (default).
   * `compact` — current month only, weekday initials, ~7px dots, no legend/nav.
   */
  variant?: "full" | "compact";
  /** Highlighted day (YYYY-MM-DD). Full variant only. */
  selectedDate?: string | null;
  /** Day tap (full variant). Compact days are not interactive. */
  onDaySelect?: (date: string) => void;
};

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/**
 * Visual state from value + calendar day vs today.
 * Missed = scheduled (value !== null), not completed (value <= 0), and day is past.
 * Future scheduled days are upcoming — never missed.
 */
export function adherenceDayVisual(
  value: number | null,
  ymd: string,
  todayYmd: string
): AdherenceDayVisual {
  if (value == null || Number.isNaN(value)) return "none";
  if (value >= 1) return "full";
  if (value > 0) return "partial";
  // value <= 0 — scheduled but incomplete
  if (ymd < todayYmd) return "missed";
  return "upcoming";
}

function visualClass(visual: AdherenceDayVisual): string {
  switch (visual) {
    case "full":
      return styles.cellFull;
    case "partial":
      return styles.cellPartial;
    case "missed":
      return styles.cellMissed;
    case "upcoming":
      return styles.cellUpcoming;
    case "none":
    default:
      return styles.cellNone;
  }
}

function visualAriaLabel(
  ymd: string,
  visual: AdherenceDayVisual,
  value: number | null
): string {
  switch (visual) {
    case "none":
      return `${ymd}: nothing scheduled`;
    case "full":
      return `${ymd}: complete`;
    case "partial":
      return `${ymd}: ${Math.round((value ?? 0) * 100)}%`;
    case "missed":
      return `${ymd}: missed`;
    case "upcoming":
      return `${ymd}: upcoming`;
  }
}

/**
 * Generic month-grid adherence calendar.
 * Not domain-specific — feed workout or meal ratios the same way.
 */
export function AdherenceCalendar({
  days,
  month: controlledMonth,
  defaultMonth,
  onMonthChange,
  className,
  "aria-label": ariaLabel = "Adherence calendar",
  variant = "full",
  selectedDate = null,
  onDaySelect,
}: AdherenceCalendarProps) {
  const isCompact = variant === "compact";
  const [internalMonth, setInternalMonth] = useState(() =>
    startOfMonth(defaultMonth ?? new Date())
  );
  const month = isCompact
    ? startOfMonth(new Date())
    : controlledMonth
      ? startOfMonth(controlledMonth)
      : internalMonth;

  const setMonth = (next: Date) => {
    if (isCompact) return;
    const normalized = startOfMonth(next);
    if (!controlledMonth) setInternalMonth(normalized);
    onMonthChange?.(normalized);
  };

  const byDate = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const d of days) m.set(d.date, d.value);
    return m;
  }, [days]);

  const todayYmd = toLocalDateString(new Date());

  const cells = useMemo(() => {
    const year = month.getFullYear();
    const mon = month.getMonth();
    const first = new Date(year, mon, 1);
    const daysInMonth = new Date(year, mon + 1, 0).getDate();
    // Monday-first: Sun=0 → 6, Mon=1 → 0, …
    const startPad = (first.getDay() + 6) % 7;
    const out: {
      key: string;
      ymd: string | null;
      dayNum: number | null;
      value: number | null;
      inMonth: boolean;
    }[] = [];

    for (let i = 0; i < startPad; i++) {
      out.push({
        key: `pad-${i}`,
        ymd: null,
        dayNum: null,
        value: null,
        inMonth: false,
      });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const ymd = toLocalDateString(new Date(year, mon, day));
      const value = byDate.has(ymd) ? (byDate.get(ymd) ?? null) : null;
      out.push({
        key: ymd,
        ymd,
        dayNum: day,
        value,
        inMonth: true,
      });
    }
    while (out.length % 7 !== 0) {
      out.push({
        key: `trail-${out.length}`,
        ymd: null,
        dayNum: null,
        value: null,
        inMonth: false,
      });
    }
    return out;
  }, [month, byDate]);

  const weekdaysFull = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekdaysCompact = ["M", "T", "W", "T", "F", "S", "S"];
  const weekdays = isCompact ? weekdaysCompact : weekdaysFull;

  return (
    <section
      className={cn(
        styles.root,
        isCompact && styles.rootCompact,
        className
      )}
      aria-label={ariaLabel}
    >
      {!isCompact ? (
        <div className={styles.header}>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Previous month"
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <h3 className={styles.monthTitle}>{monthLabel(month)}</h3>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Next month"
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}

      <div className={styles.weekdayRow} aria-hidden>
        {weekdays.map((w, i) => (
          <span key={`${w}-${i}`} className={styles.weekday}>
            {w}
          </span>
        ))}
      </div>

      <div className={styles.grid} role="grid" aria-label={monthLabel(month)}>
        {cells.map((cell) => {
          if (!cell.inMonth || !cell.ymd) {
            return <div key={cell.key} className={styles.cellPad} />;
          }
          const visual = adherenceDayVisual(cell.value, cell.ymd, todayYmd);
          const isToday = cell.ymd === todayYmd;
          const isSelected = !isCompact && selectedDate === cell.ymd;
          const label = visualAriaLabel(cell.ymd, visual, cell.value);
          const interactive = !isCompact && !!onDaySelect;
          const classNames = cn(
            styles.cell,
            visualClass(visual),
            isToday && styles.cellToday,
            isSelected && styles.cellSelected,
            interactive && styles.cellInteractive
          );
          const inner = isCompact ? (
            <span className={styles.dot} aria-hidden />
          ) : (
            <span className={styles.dayNum}>{cell.dayNum}</span>
          );

          if (interactive) {
            return (
              <button
                key={cell.key}
                type="button"
                role="gridcell"
                className={classNames}
                title={label}
                aria-label={label}
                aria-selected={isSelected}
                onClick={() => onDaySelect?.(cell.ymd!)}
              >
                {inner}
              </button>
            );
          }

          return (
            <div
              key={cell.key}
              role="gridcell"
              className={classNames}
              title={label}
              aria-label={label}
            >
              {inner}
            </div>
          );
        })}
      </div>

      {!isCompact ? (
        <ul className={styles.legend}>
          <li>
            <span
              className={cn(styles.legendSwatch, styles.cellNone)}
              aria-hidden
            />
            None
          </li>
          <li>
            <span
              className={cn(styles.legendSwatch, styles.cellMissed)}
              aria-hidden
            />
            Missed
          </li>
          <li>
            <span
              className={cn(styles.legendSwatch, styles.cellPartial)}
              aria-hidden
            />
            Partial
          </li>
          <li>
            <span
              className={cn(styles.legendSwatch, styles.cellFull)}
              aria-hidden
            />
            Full
          </li>
        </ul>
      ) : null}
    </section>
  );
}
