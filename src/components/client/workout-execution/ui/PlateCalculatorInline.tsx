"use client";

import React from "react";

type PlateCalculatorInlineProps = {
  weightKg: number;
  barKg?: number;
  availablePlates?: number[];
};

const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

const PLATE_COLOR_MAP: Record<string, string> = {
  "25": "bg-red-500/80 text-white",
  "20": "bg-blue-500/80 text-white",
  "15": "bg-yellow-400/85 text-black",
  "10": "bg-green-500/80 text-white",
  "5": "bg-zinc-100/90 text-zinc-900",
  "2.5": "bg-zinc-700/90 text-zinc-100",
  "1.25": "bg-zinc-300/95 text-zinc-900",
};

function formatPlate(v: number): string {
  return Number.isInteger(v) ? String(v) : String(v);
}

function solvePerSide(
  totalKg: number,
  barKg: number,
  platesDesc: number[],
): { plates: number[]; achievedTotal: number } {
  const perSideTarget = Math.max(0, (totalKg - barKg) / 2);
  let remaining = perSideTarget;
  const used: number[] = [];
  for (const p of platesDesc) {
    while (remaining + 1e-9 >= p) {
      used.push(p);
      remaining -= p;
    }
  }
  const achievedPerSide = used.reduce((s, p) => s + p, 0);
  return { plates: used, achievedTotal: barKg + achievedPerSide * 2 };
}

export function PlateCalculatorInline({
  weightKg,
  barKg = 20,
  availablePlates = DEFAULT_PLATES,
}: PlateCalculatorInlineProps) {
  const total = Number.isFinite(weightKg) ? Math.max(0, weightKg) : 0;
  const platesDesc = [...availablePlates].sort((a, b) => b - a);
  const solution = solvePerSide(total, barKg, platesDesc);

  const minPlate = platesDesc[platesDesc.length - 1] ?? 1.25;
  const step = minPlate * 2;
  const nearest = barKg + Math.round((total - barKg) / step) * step;
  const nearestSolution = solvePerSide(Math.max(barKg, nearest), barKg, platesDesc);

  const exact = Math.abs(solution.achievedTotal - total) < 0.001;
  const summary =
    solution.plates.length > 0
      ? `${solution.plates.map(formatPlate).join(" + ")} per side`
      : "No plates per side";

  return (
    <div className="mt-2 rounded-lg border border-cyan-500/15 bg-cyan-500/[0.03] p-3">
      <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/70">
        PLATES PER SIDE
      </div>

      <div className="mb-2 flex min-h-10 items-center gap-1.5 overflow-x-auto">
        {solution.plates.length === 0 ? (
          <span className="text-xs text-gray-400">Bar only</span>
        ) : (
          solution.plates.map((p, idx) => (
            <span
              key={`${p}-${idx}`}
              className={`rounded px-2 py-1 text-[11px] font-semibold ${PLATE_COLOR_MAP[String(p)] ?? "bg-zinc-600/80 text-white"}`}
            >
              {formatPlate(p)}
            </span>
          ))
        )}
      </div>

      <p className="text-xs text-gray-400">
        {summary} · Bar: {barKg}kg · Total: {exact ? total : solution.achievedTotal}kg
      </p>

      {!exact ? (
        <p className="mt-1 text-xs text-amber-400">
          Nearest: {nearestSolution.achievedTotal}kg
        </p>
      ) : null}
    </div>
  );
}
