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

  return (
    <div className="flex flex-wrap gap-3">
      {validDetails.map((detail, index) => (
        <div
          key={index}
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "var(--fc-surface-sunken)" }}
        >
          <span className="text-[10px] uppercase tracking-wider fc-text-dim font-semibold">
            {detail.label}
          </span>
          <span className="font-mono font-bold text-sm fc-text-primary">
            {detail.value}
            {detail.unit && (
              <span className="fc-text-dim ml-0.5">
                {detail.unit}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
