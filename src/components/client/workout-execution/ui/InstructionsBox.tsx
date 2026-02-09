"use client";

import React from "react";
import { Info } from "lucide-react";

interface InstructionsBoxProps {
  instructions: string;
  className?: string;
}

export function InstructionsBox({
  instructions,
  className = "",
}: InstructionsBoxProps) {
  if (!instructions || instructions.trim() === "") {
    return null;
  }

  return (
    <div
      className={`rounded-xl p-3 ${className}`}
      style={{
        background: "color-mix(in srgb, var(--fc-accent-cyan) 8%, var(--fc-surface-card))",
        borderLeft: "3px solid var(--fc-accent-cyan)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--fc-accent-cyan)" }} />
        <div>
          <h4 className="font-semibold text-xs fc-text-primary mb-0.5">
            Instructions
          </h4>
          <p className="text-xs fc-text-dim leading-relaxed">
            {instructions}
          </p>
        </div>
      </div>
    </div>
  );
}
