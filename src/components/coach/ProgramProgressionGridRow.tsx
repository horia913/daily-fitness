"use client";

import type { ProgramProgressionRule } from "@/lib/programProgressionService";
import type { ProgramProgressionGridRow as GridRow, ProgressionGridCellRef } from "@/hooks/useProgramProgressionGrid";
import { formatCellDisplay } from "@/hooks/useProgramProgressionGrid";
import ProgramProgressionGridCell from "@/components/coach/ProgramProgressionGridCell";
import { ProgramEditSetTypePill } from "@/components/coach/programs/ProgramEditSetTypePill";
import css from "@/components/coach/programs/programEditV1.module.css";

type SaveResult = { ok: true } | { ok: false; error: string };

function progressionDeltaHint(
  curr: ProgressionGridCellRef | undefined,
  prev: ProgressionGridCellRef | undefined,
): string | null {
  if (!curr?.rule || !prev?.rule) return null;
  const a = formatCellDisplay(curr).trim();
  const b = formatCellDisplay(prev).trim();
  if (a === b || a === "—" || b === "—") return null;
  return "▲ adjusted";
}

export default function ProgramProgressionGridRow(props: {
  row: GridRow;
  weeks: number[];
  cellSaving: Record<string, boolean>;
  cellErrors: Record<string, string | null>;
  onSaveCell: (cell: ProgressionGridCellRef, patch: Partial<ProgramProgressionRule>) => Promise<SaveResult>;
  onConfigure: (row: GridRow) => void;
  onOpenFullEditor: (cell: ProgressionGridCellRef) => void;
  gridTemplate: string;
  accentWeekNumber?: number | null;
}) {
  const {
    row,
    weeks,
    cellSaving,
    cellErrors,
    onSaveCell,
    onConfigure,
    onOpenFullEditor,
    gridTemplate,
    accentWeekNumber = null,
  } = props;

  const tempoOrDash = row.structural.tempo?.trim() ? row.structural.tempo : "—";
  const metaParts = [
    row.structural.sets != null ? `${row.structural.sets} sets` : "— sets",
    row.structural.restSeconds != null ? `${row.structural.restSeconds}s rest` : "—",
    tempoOrDash,
  ];

  return (
    <div
      className={`grid border-b border-[rgba(255,255,255,0.06)] ${css.wrap}`}
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <div
        className="sticky left-0 z-20 flex flex-col gap-1.5 px-2 py-2 border-r border-[rgba(255,255,255,0.08)] bg-[var(--pe-card)] hover:bg-[#0F2334] transition-colors min-w-0"
      >
        <div className="flex items-center justify-between gap-2">
          <ProgramEditSetTypePill setType={row.blockType} />
          <button
            type="button"
            onClick={() => onConfigure(row)}
            className="rounded-md px-[7px] py-[3px] text-[8.5px] font-semibold uppercase tracking-[0.08em] text-[var(--pe-cyan)] bg-[rgba(79,227,232,0.12)] border border-[rgba(79,227,232,0.18)] hover:bg-[rgba(79,227,232,0.18)] transition-colors shrink-0"
            style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
          >
            Configure
          </button>
        </div>
        <p
          className="text-[12px] font-medium text-[var(--pe-t1)] leading-snug line-clamp-2"
          style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
        >
          {row.rowLabel}
        </p>
        <p
          className="text-[9.5px] text-[var(--pe-t3)] leading-snug"
          style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
        >
          {metaParts[0]} · {metaParts[1]} · {metaParts[2]}
        </p>
      </div>

      {weeks.map((week) => {
        const cell = row.cells[week];
        const key = `${row.id}|${week}`;
        const prevCell = week > 1 ? row.cells[week - 1] : undefined;
        const delta = progressionDeltaHint(cell, prevCell);
        return (
          <div key={week} className="p-1 min-h-[46px] flex items-stretch">
            <ProgramProgressionGridCell
              cell={cell}
              saving={Boolean(cellSaving[key])}
              error={cellErrors[key]}
              onSave={onSaveCell}
              onOpenFullEditor={onOpenFullEditor}
              accentWeek={accentWeekNumber != null && week === accentWeekNumber}
              deltaHint={delta}
            />
          </div>
        );
      })}
    </div>
  );
}
