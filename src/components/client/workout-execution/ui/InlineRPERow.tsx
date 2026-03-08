"use client";

import React, { useState } from "react";

interface InlineRPERowProps {
  setLogId: string | null; // null for optimistic (not yet synced) sets
  currentRPE: number | null;
  onRPESelect: (rpe: number) => void;
  isLatestSet: boolean; // Controls styling (label visibility, opacity) but NOT visibility
}

const EFFORT_OPTIONS = [
  { label: 'Easy', emoji: '😎', rpe: 6, color: '#22C55E' },
  { label: 'Solid', emoji: '💪', rpe: 8, color: '#0EA5E9' },
  { label: 'Hard', emoji: '😤', rpe: 9, color: '#F97316' },
  { label: 'Max', emoji: '🔥', rpe: 10, color: '#EF4444' },
];

function getEffortFromRPE(rpe: number): { label: string; emoji: string; color: string } | null {
  if (rpe <= 7) return { label: 'Easy', emoji: '😎', color: '#22C55E' };
  if (rpe === 8) return { label: 'Solid', emoji: '💪', color: '#0EA5E9' };
  if (rpe === 9) return { label: 'Hard', emoji: '😤', color: '#F97316' };
  if (rpe >= 10) return { label: 'Max', emoji: '🔥', color: '#EF4444' };
  return null;
}

export function InlineRPERow({
  setLogId,
  currentRPE,
  onRPESelect,
  isLatestSet,
}: InlineRPERowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const selectedEffort = currentRPE !== null && currentRPE !== undefined 
    ? getEffortFromRPE(currentRPE) 
    : null;

  const handleSelect = (rpe: number) => {
    setIsAnimating(true);
    onRPESelect(rpe);
    setIsExpanded(false);
    setTimeout(() => setIsAnimating(false), 200);
  };

  const handleToggleExpand = () => {
    if (selectedEffort) {
      setIsExpanded(!isExpanded);
    }
  };

  // State B: Effort selected - show compact display (tappable to change)
  if (selectedEffort && !isExpanded) {
    return (
      <div 
        className={`flex items-center gap-1.5 mt-1 transition-opacity ${isLatestSet ? 'opacity-100' : 'opacity-80'}`}
        onClick={handleToggleExpand}
        style={{ cursor: 'pointer' }}
      >
        <span 
          className="text-sm font-semibold px-2 py-1 rounded-full transition-colors hover:opacity-80"
          style={{ 
            color: selectedEffort.color,
            border: `1px solid ${selectedEffort.color}40`,
            background: `${selectedEffort.color}10`
          }}
        >
          {selectedEffort.emoji} {selectedEffort.label}
        </span>
      </div>
    );
  }

  // State A: No effort selected OR expanded to change - show 4 effort buttons
  return (
    <div className={`mt-1.5 transition-opacity ${isLatestSet ? 'opacity-100' : 'opacity-80'}`}>
      {isLatestSet && (
        <div className="mb-1.5">
          <span className="text-xs font-medium fc-text-dim">How hard was that?</span>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {EFFORT_OPTIONS.map((option) => {
          const isSelected = currentRPE !== null && currentRPE !== undefined && currentRPE === option.rpe;
          return (
            <button
              key={option.rpe}
              type="button"
              onClick={() => handleSelect(option.rpe)}
              className={`
                rounded-full border-2 transition-all duration-150
                flex items-center gap-1.5 text-xs font-semibold
                ${isAnimating ? "scale-95" : "active:scale-95"}
                ${isSelected ? "" : "hover:opacity-80"}
              `}
              style={{
                minWidth: '64px',
                height: '32px',
                borderColor: option.color,
                color: isSelected ? '#FFFFFF' : option.color,
                background: isSelected ? option.color : 'transparent',
                padding: '0 10px',
                justifyContent: 'center',
              }}
              aria-label={`${option.label} effort`}
            >
              <span className="text-sm">{option.emoji}</span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
