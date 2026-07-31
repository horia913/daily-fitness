"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import type { WorkoutSetEntry } from "@/types/workoutSetEntries";
import {
  calculateVolumePerMuscleGroup,
  isGuidelineCategory,
} from "@/lib/coachGuidelinesService";
import wt from "@/components/coach/workouts/workoutTemplateEditV1.module.css";
import { cn } from "@/lib/utils";

interface VolumeCalculatorWidgetProps {
  blocks: WorkoutSetEntry[];
  category: string;
  className?: string;
  /** Coach workout template editor v1 layout (always expanded, token styling). */
  coachV1?: boolean;
}

export default function VolumeCalculatorWidget({
  blocks,
  category,
  className,
  coachV1 = false,
}: VolumeCalculatorWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const isGuidelineCat = isGuidelineCategory(category);

  const volumePerMuscleGroup = useMemo(() => {
    if (!isGuidelineCat) return new Map<string, number>();
    return calculateVolumePerMuscleGroup(blocks);
  }, [blocks, isGuidelineCat, category]);

  if (!isGuidelineCat) {
    return null;
  }

  const sortedMuscleGroups = Array.from(volumePerMuscleGroup.entries()).sort(
    (a, b) => b[1] - a[1],
  );
  const totalSets = sortedMuscleGroups.reduce((sum, [, sets]) => sum + sets, 0);
  const maxSets =
    sortedMuscleGroups.length > 0 ? Math.max(...sortedMuscleGroups.map(([, s]) => s)) : 0;

  if (coachV1) {
    return (
      <div className={cn(wt.balanceCard, className)}>
        <div className={wt.balanceHead}>
          <div className={wt.balanceIconTile}>
            <BarChart3 className="w-[17px] h-[17px]" strokeWidth={2} />
          </div>
          <div className={wt.balanceMeta}>
            <div className={wt.balanceEyebrow}>Session balance</div>
            <div className={wt.balanceTitle}>Muscle group sets</div>
          </div>
          {volumePerMuscleGroup.size > 0 && (
            <span className={wt.groupsPill}>{volumePerMuscleGroup.size} groups</span>
          )}
        </div>

        {sortedMuscleGroups.length > 0 && (
          <p className={wt.balanceSummary}>
            <strong>{totalSets}</strong> total sets across{" "}
            <strong>{sortedMuscleGroups.length}</strong> muscle groups in this session.
          </p>
        )}

        <div className={wt.balanceList}>
          {sortedMuscleGroups.length > 0 ? (
            sortedMuscleGroups.map(([muscleGroup, currentSets]) => {
              const pct =
                maxSets > 0 ? Math.round((currentSets / maxSets) * 100) : 0;
              return (
                <div key={muscleGroup} className={wt.balanceRow}>
                  <span className={wt.balanceMuscleName}>{muscleGroup}</span>
                  <div className={wt.balanceRight}>
                    <div className={wt.balanceBarTrack}>
                      <div
                        className={wt.balanceBarFill}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={wt.balanceCount}>{currentSets}</span>
                    <span className={wt.balanceUnit}>
                      {currentSets === 1 ? "set" : "sets"}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p
              className="text-center text-[12px] py-2"
              style={{ color: "rgba(255,255,255,0.42)" }}
            >
              Add exercises to see muscle group breakdown
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`fc-card-shell ${className || ""}`}>
      <div className="p-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className="fc-icon-tile fc-icon-workouts">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-[10px]">
                Session balance
              </span>
              <div className="text-sm font-semibold fc-text-primary">
                Muscle Group Sets (this session)
              </div>
            </div>
            {volumePerMuscleGroup.size > 0 && (
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                {volumePerMuscleGroup.size} muscle groups
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto fc-btn fc-btn-ghost"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {sortedMuscleGroups.length > 0 && (
            <p className="text-xs fc-text-dim">
              {totalSets} total sets across {sortedMuscleGroups.length} muscle groups.
            </p>
          )}

          <div className="space-y-3">
            <Label className="text-xs font-semibold fc-text-primary block">
              Muscle Group Breakdown
            </Label>
            {sortedMuscleGroups.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sortedMuscleGroups.map(([muscleGroup, currentSets]) => (
                  <div
                    key={muscleGroup}
                    className="p-3 rounded-2xl border border-[color:var(--fc-glass-border)] fc-glass-soft"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium fc-text-primary">
                        {muscleGroup}
                      </span>
                      <span className="text-sm font-semibold fc-text-primary">
                        {currentSets} sets
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-[color:var(--fc-glass-border)] text-center fc-glass-soft">
                <p className="text-sm fc-text-dim">
                  Add exercises to see muscle group breakdown
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
