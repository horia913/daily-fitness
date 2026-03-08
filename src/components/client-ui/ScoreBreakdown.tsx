"use client";

import React, { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ScoreBreakdownProps {
  scores: {
    workout: number;
    program: number;
    checkin: number;
    goals: number;
    nutrition: number;
  };
}

export function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const breakdownItems = [
    { label: "Workouts", value: scores.workout, color: "var(--fc-domain-workouts)" },
    { label: "Program", value: scores.program, color: "var(--fc-accent-purple)" },
    { label: "Check-ins", value: scores.checkin, color: "var(--fc-accent-cyan)" },
    { label: "Goals", value: scores.goals, color: "var(--fc-status-success)" },
    { label: "Nutrition", value: scores.nutrition, color: "var(--fc-domain-meals)" },
  ];

  return (
    <div className="w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-center gap-2 text-sm fc-text-dim hover:fc-text-primary transition-colors py-2"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Hide breakdown
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            View breakdown
          </>
        )}
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? "400px" : "0",
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="space-y-3 pt-2">
          {breakdownItems.map((item) => (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium fc-text-primary">
                  {item.label}
                </span>
                <span className="text-sm font-bold fc-text-primary">
                  {Math.round(item.value)}%
                </span>
              </div>
              <div className="relative h-2 w-full rounded-full overflow-hidden" style={{ background: "var(--fc-surface-sunken)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${item.value}%`,
                    background: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
