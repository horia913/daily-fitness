"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown,
  ChevronUp,
  BarChart3,
  Target,
  Info,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { WorkoutBlock } from "@/types/workoutBlocks";
import {
  calculateVolumePerMuscleGroup,
  detectPriorityMuscleGroup,
  getVolumeRecommendationForMuscleGroup,
  isGuidelineCategory,
  type MuscleGroupVolumeRecommendation,
} from "@/lib/coachGuidelinesService";
import VolumeDetailsModal from "./VolumeDetailsModal";

interface VolumeCalculatorWidgetProps {
  blocks: WorkoutBlock[];
  category: string;
  difficulty: string;
  daysPerWeek: number;
  excludeFromRecommendations: boolean;
  onToggleExclude: (excluded: boolean) => void;
  onDaysPerWeekChange: (days: number) => void;
  className?: string;
}

export default function VolumeCalculatorWidget({
  blocks,
  category,
  difficulty,
  daysPerWeek,
  excludeFromRecommendations,
  onToggleExclude,
  onDaysPerWeekChange,
  className,
}: VolumeCalculatorWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Check if this is a guideline category
  const isGuidelineCat = isGuidelineCategory(category);
  
  // Calculate volume per muscle group (memoized)
  const volumePerMuscleGroup = useMemo(() => {
    if (!isGuidelineCat) return new Map<string, number>();
    return calculateVolumePerMuscleGroup(blocks);
  }, [blocks, isGuidelineCat, category]);

  // Detect priority muscle group
  const priorityMuscleGroup = useMemo(() => {
    return detectPriorityMuscleGroup(volumePerMuscleGroup);
  }, [volumePerMuscleGroup]);

  // Get volume recommendations for each muscle group (async)
  const [recommendations, setRecommendations] = useState<Map<string, MuscleGroupVolumeRecommendation>>(new Map());

  useEffect(() => {
    if (!isGuidelineCat || excludeFromRecommendations) {
      setRecommendations(new Map());
      return;
    }

    const loadRecommendations = async () => {
      const normalizedDifficulty = difficulty.toLowerCase();
      const entries = Array.from(volumePerMuscleGroup.entries());
      const results = await Promise.all(
        entries.map(([muscleGroup, currentSets]) =>
          getVolumeRecommendationForMuscleGroup(
            muscleGroup,
            currentSets,
            category,
            normalizedDifficulty,
            muscleGroup === priorityMuscleGroup,
            daysPerWeek
          ).then((recommendation) => [muscleGroup, recommendation] as const)
        )
      );
      setRecommendations(new Map(results));
    };

    loadRecommendations();
  }, [
    volumePerMuscleGroup,
    category,
    difficulty,
    priorityMuscleGroup,
    daysPerWeek,
    isGuidelineCat,
    excludeFromRecommendations,
  ]);

  // Get status color
  const getStatusColor = (status: string) => {
    if (excludeFromRecommendations) {
      return "fc-text-dim";
    }

    switch (status) {
      case "optimal":
        return "fc-text-success";
      case "below":
        return "fc-text-warning";
      case "high":
        return "fc-text-warning";
      case "excessive":
        return "fc-text-error";
      default:
        return "fc-text-dim";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    if (excludeFromRecommendations) {
      return <Info className="w-4 h-4 fc-text-subtle" />;
    }

    switch (status) {
      case "optimal":
        return <CheckCircle2 className="w-4 h-4 fc-text-success" />;
      case "below":
        return <TrendingDown className="w-4 h-4 fc-text-warning" />;
      case "high":
        return <TrendingUp className="w-4 h-4 fc-text-warning" />;
      case "excessive":
        return <AlertCircle className="w-4 h-4 fc-text-error" />;
      default:
        return <Info className="w-4 h-4 fc-text-subtle" />;
    }
  };

  // Calculate progress percentage for progress bar
  const getProgressPercentage = (
    current: number,
    min: number,
    optimal: number,
    max: number
  ): number => {
    if (current < min) return (current / min) * 50; // 0-50% for below
    if (current <= optimal) return 50 + ((current - min) / (optimal - min)) * 30; // 50-80% for optimal range
    if (current <= max) return 80 + ((current - optimal) / (max - optimal)) * 15; // 80-95% for high
    return Math.min(100, 95 + ((current - max) / max) * 5); // 95-100%+ for excessive
  };

  // Get recommendation text
  const getRecommendationText = (rec: MuscleGroupVolumeRecommendation): string => {
    if (category === "Hypertrophy") {
      if (rec.isPriority) {
        return `${rec.recommendedMin}-${rec.recommendedOptimal} sets/week`;
      } else {
        if (rec.maintenanceVolume === 0) {
          return "No maintenance volume";
        }
        return `${rec.maintenanceVolume} sets/week (Maintenance)`;
      }
    } else {
      return `${rec.recommendedMin}-${rec.recommendedOptimal} sets/week`;
    }
  };

  // Don't show widget if not a guideline category
  if (!isGuidelineCat) {
    return null;
  }

  // Sort muscle groups by volume (highest first)
  const sortedMuscleGroups = Array.from(volumePerMuscleGroup.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div
      className={`fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] ${className || ""}`}
    >
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
                Volume calculator
              </span>
              <div className="text-sm font-semibold fc-text-primary">
                Volume Calculator
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
          {/* Configuration */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-xs font-medium fc-text-subtle mb-1 block">
                  Days/Week
                </Label>
                <Input
                  type="number"
                  min="2"
                  max="7"
                  value={daysPerWeek}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 3;
                    onDaysPerWeekChange(Math.max(2, Math.min(7, value)));
                  }}
                  className="rounded-lg w-20 fc-glass-soft border border-[color:var(--fc-glass-border)]"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="exclude-recommendations"
                  checked={excludeFromRecommendations}
                  onCheckedChange={(checked) =>
                    onToggleExclude(checked === true)
                  }
                />
                <Label
                  htmlFor="exclude-recommendations"
                  className="text-xs fc-text-subtle cursor-pointer"
                >
                  Exclude from recommendations
                </Label>
              </div>
            </div>

            {/* Priority Muscle Indicator */}
            {priorityMuscleGroup && (
              <div className="p-3 rounded-2xl border border-[color:var(--fc-glass-border)] fc-glass-soft">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 fc-text-workouts" />
                  <span className="text-xs font-medium fc-text-primary">
                    Priority Muscle:{" "}
                    <span className="font-semibold">{priorityMuscleGroup}</span>
                    {" "}({volumePerMuscleGroup.get(priorityMuscleGroup)} sets/week)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Muscle Group Breakdown */}
          {sortedMuscleGroups.length > 0 ? (
            <div className="space-y-3">
              <Label className="text-xs font-semibold fc-text-primary block">
                Muscle Group Breakdown
              </Label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sortedMuscleGroups.map(([muscleGroup, currentSets]) => {
                  const rec = recommendations.get(muscleGroup);
                  const isPriority = muscleGroup === priorityMuscleGroup;

                  if (!rec) {
                    // No recommendation available (excluded or no guideline)
                    return (
                      <div
                        key={muscleGroup}
                        className="p-3 rounded-2xl border border-[color:var(--fc-glass-border)] fc-glass-soft"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium fc-text-primary">
                              {muscleGroup}
                            </span>
                            {isPriority && (
                              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                                Priority
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-semibold fc-text-primary">
                            {currentSets} sets/week
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const progressPercent = getProgressPercentage(
                    currentSets,
                    rec.recommendedMin,
                    rec.recommendedOptimal,
                    rec.recommendedMax
                  );

                  return (
                    <div
                      key={muscleGroup}
                        className="p-3 rounded-2xl border border-[color:var(--fc-glass-border)] fc-glass-soft"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(rec.status)}
                            <span className="text-sm font-medium fc-text-primary">
                            {muscleGroup}
                          </span>
                          {isPriority && (
                              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                                Priority
                              </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${getStatusColor(rec.status)}`}
                          >
                            {currentSets} sets
                          </span>
                          {!excludeFromRecommendations && (
                              <span className={`fc-pill fc-pill-glass text-xs ${getStatusColor(rec.status)}`}>
                              {rec.status}
                              </span>
                          )}
                        </div>
                      </div>

                      {!excludeFromRecommendations && (
                        <>
                            <div className="h-2 mb-2 fc-progress-track">
                              <div
                                className="h-full fc-progress-fill"
                                style={{ width: `${Math.min(100, progressPercent)}%` }}
                              />
                            </div>
                          <div className="flex items-center justify-between">
                              <span className="text-xs fc-text-subtle">
                              Target: {getRecommendationText(rec)}
                            </span>
                            {rec.status !== "optimal" && (
                              <span
                                className={`text-xs ${getStatusColor(rec.status)}`}
                              >
                                {rec.status === "below" &&
                                  `+${Math.max(0, rec.recommendedMin - currentSets)} sets needed`}
                                {rec.status === "high" &&
                                  `Consider reducing by ${currentSets - rec.recommendedMax} sets`}
                                {rec.status === "excessive" &&
                                  `Reduce by ${currentSets - rec.recommendedMax}+ sets`}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-[color:var(--fc-glass-border)] text-center fc-glass-soft">
              <p className="text-sm fc-text-dim">
                Add exercises to see volume calculations
              </p>
            </div>
          )}

          {/* View Details Button */}
          {sortedMuscleGroups.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDetailsModal(true)}
              className="w-full fc-btn fc-btn-secondary"
            >
              <Info className="w-4 h-4 mr-2" />
              View Detailed Breakdown
            </Button>
          )}
        </div>
      )}

      {/* Details Modal */}
      <VolumeDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        blocks={blocks}
        category={category}
        difficulty={difficulty}
        daysPerWeek={daysPerWeek}
        excludeFromRecommendations={excludeFromRecommendations}
      />
    </div>
  );
}
