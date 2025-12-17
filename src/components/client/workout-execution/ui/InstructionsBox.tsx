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
      className={`bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 ${className}`}
    >
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-1 text-sm">
            Instructions
          </h4>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            {instructions}
          </p>
        </div>
      </div>
    </div>
  );
}
