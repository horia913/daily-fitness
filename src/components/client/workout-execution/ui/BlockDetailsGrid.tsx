"use client";

import React from "react";

export interface BlockDetail {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}

interface BlockDetailsGridProps {
  details: BlockDetail[];
  columns?: 2 | 4;
}

export function BlockDetailsGrid({
  details,
  columns = 4,
}: BlockDetailsGridProps) {
  const validDetails = details.filter(
    (detail) =>
      detail.value !== null && detail.value !== undefined && detail.value !== ""
  );

  if (validDetails.length === 0) {
    return null;
  }

  const gridCols = columns === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4";

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {validDetails.map((detail, index) => (
        <div
          key={index}
          className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 text-center border border-slate-200 dark:border-slate-700"
        >
          <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wide mb-1">
            {detail.label}
          </div>
          <div className="text-2xl text-slate-900 dark:text-slate-100 font-bold">
            {detail.value}
            {detail.unit && (
              <span className="text-lg text-slate-600 dark:text-slate-400 ml-1">
                {detail.unit}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
