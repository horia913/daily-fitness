"use client";

import { Fragment, useEffect, useMemo } from "react";
import type { ProgramSchedule } from "@/lib/workoutTemplateService";
import ProgramProgressionGridRow from "@/components/coach/ProgramProgressionGridRow";
import type { ProgramProgressionGridRow as GridRow, ProgressionGridCellRef } from "@/hooks/useProgramProgressionGrid";
import { useProgramProgressionGrid } from "@/hooks/useProgramProgressionGrid";
import css from "@/components/coach/programs/programEditV1.module.css";

export default function ProgramProgressionGrid(props: {
  programId: string;
  durationWeeks: number;
  schedule: ProgramSchedule[];
  onConfigureRow: (row: GridRow) => void;
  onOpenFullEditorCell: (cell: ProgressionGridCellRef) => void;
  /** Bump to refetch grid data after bulk deletes (e.g. Skip progression). */
  reloadSignal?: number;
  /** Absolute program week (1..durationWeeks) highlighted as “current” in the grid chrome. */
  accentWeekNumber?: number | null;
}) {
  const {
    programId,
    durationWeeks,
    schedule,
    onConfigureRow,
    onOpenFullEditorCell,
    reloadSignal = 0,
    accentWeekNumber = null,
  } = props;

  const { rows, loading, error, saveCell, cellSaving, cellErrors, refresh } = useProgramProgressionGrid({
    programId,
    durationWeeks,
    schedule,
  });

  const weeks = useMemo(
    () => Array.from({ length: durationWeeks }, (_, i) => i + 1),
    [durationWeeks],
  );

  const dayGroups = useMemo(() => {
    const map = new Map<number, GridRow[]>();
    rows.forEach((row) => {
      const list = map.get(row.day) || [];
      list.push(row);
      map.set(row.day, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [rows]);

  useEffect(() => {
    if (!reloadSignal) return;
    refresh().catch(console.error);
  }, [reloadSignal, refresh]);

  const gridTemplate = useMemo(
    () => `160px repeat(${weeks.length}, minmax(72px, 90px))`,
    [weeks.length],
  );

  if (loading) {
    return (
      <div className={`rounded-2xl border border-[rgba(255,255,255,0.08)] p-4 ${css.wrap}`} style={{ background: "var(--pe-card)" }}>
        <p className="text-sm text-[var(--pe-t3)]">Loading progression grid...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl border border-[rgba(255,255,255,0.08)] p-4 ${css.wrap}`} style={{ background: "var(--pe-card)" }}>
        <p className="text-sm text-[#FF5A5F]">{error}</p>
      </div>
    );
  }

  const fullDayNames: Record<string, string> = {
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
    Sun: "Sunday",
  };

  return (
    <div className={`rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden ${css.wrap}`} style={{ background: "var(--pe-card)" }}>
      <div className={`overflow-x-auto ${css.progScroll}`}>
        <div className="min-w-[880px] p-0" style={{ minWidth: `max(880px, ${160 + weeks.length * 90}px)` }}>
          <div
            className="grid items-stretch border-b border-[rgba(255,255,255,0.08)] bg-[var(--pe-card-2)]"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div
              className="sticky left-0 z-30 px-2 py-3 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--pe-t3)] border-r border-[rgba(255,255,255,0.08)] bg-[var(--pe-card-2)]"
              style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
            >
              Exercise
            </div>
            {weeks.map((w) => {
              const accent = accentWeekNumber != null && w === accentWeekNumber;
              return (
                <div
                  key={w}
                  className={`px-1 py-3 text-center text-[9.5px] font-semibold uppercase tracking-[0.1em] border-l border-transparent ${
                    accent ? "text-[var(--pe-cyan)] bg-[rgba(79,227,232,0.06)]" : "text-[var(--pe-t3)]"
                  }`}
                  style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
                >
                  {accent ? (
                    <span className="inline-flex items-center justify-center gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          background: "#4FE3E8",
                          boxShadow: "0 0 6px #4FE3E8",
                        }}
                      />
                      Wk {w}
                    </span>
                  ) : (
                    <>Wk {w}</>
                  )}
                </div>
              );
            })}
          </div>

          {dayGroups.map(([dayNum, dayRows]) => (
            <Fragment key={`day-group-${dayNum}`}>
              <div className="w-full bg-gradient-to-r from-[rgba(79,227,232,0.12)] to-transparent border-b border-[rgba(255,255,255,0.06)]">
                <div
                  className="sticky left-0 z-20 inline-flex max-w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--pe-cyan)] items-center gap-2 bg-gradient-to-r from-[rgba(79,227,232,0.14)] to-transparent"
                  style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
                >
                  <span className="opacity-80">▣</span>
                  {fullDayNames[dayRows[0]?.dayLabel || ""] || dayRows[0]?.dayLabel || `Day ${dayNum}`}
                </div>
              </div>
              {dayRows.map((row) => (
                <ProgramProgressionGridRow
                  key={row.id}
                  row={row}
                  weeks={weeks}
                  cellSaving={cellSaving}
                  cellErrors={cellErrors}
                  onSaveCell={saveCell}
                  onConfigure={onConfigureRow}
                  onOpenFullEditor={onOpenFullEditorCell}
                  gridTemplate={gridTemplate}
                  accentWeekNumber={accentWeekNumber}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
