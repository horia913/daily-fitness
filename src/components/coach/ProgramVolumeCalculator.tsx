"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface ProgramSchedule {
  id: string;
  program_id: string;
  template_id: string;
  week_number: number;
  day_of_week?: number;
  [key: string]: any;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  category?: string | null;
  difficulty_level: string;
  blocks?: WorkoutBlock[];
  [key: string]: any;
}

interface ProgramVolumeCalculatorProps {
  programId: string;
  programCategory: string;
  programDifficulty: string;
  schedule: ProgramSchedule[];
  templates: WorkoutTemplate[];
  className?: string;
}

export default function ProgramVolumeCalculator({
  programId,
  programCategory,
  programDifficulty,
  schedule,
  templates,
  className,
}: ProgramVolumeCalculatorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Check if this is a guideline category
  const isGuidelineCat = isGuidelineCategory(programCategory);

  // Calculate aggregated volume per muscle group across all templates
  const volumePerMuscleGroup = useMemo(() => {
    if (!isGuidelineCat || schedule.length === 0) {
      return new Map<string, number>();
    }

    // Group schedule entries by week
    const weeklyVolume = new Map<string, Map<string, number>>();

    schedule.forEach((entry) => {
      const week = entry.week_number || 1;
      const weekKey = `week-${week}`;
      const template = templates.find((t) => t.id === entry.template_id);

      if (!template || !template.blocks || template.blocks.length === 0) {
        return; // Skip invalid entries
      }

      // Calculate volume for this template
      const templateVolume = calculateVolumePerMuscleGroup(template.blocks);

      // Initialize week volume map if needed
      if (!weeklyVolume.has(weekKey)) {
        weeklyVolume.set(weekKey, new Map<string, number>());
      }

      const weekVolume = weeklyVolume.get(weekKey)!;

      // Aggregate template volume into week volume
      templateVolume.forEach((sets, muscleGroup) => {
        const current = weekVolume.get(muscleGroup) || 0;
        weekVolume.set(muscleGroup, current + sets);
      });
    });

    // Calculate average weekly volume across all weeks
    const totalVolume = new Map<string, number>();
    const weekCount = weeklyVolume.size || 1;

    weeklyVolume.forEach((weekVolumeMap) => {
      weekVolumeMap.forEach((sets, muscleGroup) => {
        const current = totalVolume.get(muscleGroup) || 0;
        totalVolume.set(muscleGroup, current + sets);
      });
    });

    // Average across weeks
    const averageVolume = new Map<string, number>();
    totalVolume.forEach((totalSets, muscleGroup) => {
      averageVolume.set(muscleGroup, totalSets / weekCount);
    });

    return averageVolume;
  }, [schedule, templates, isGuidelineCat]);

  // Detect priority muscle group
  const priorityMuscleGroup = useMemo(() => {
    return detectPriorityMuscleGroup(volumePerMuscleGroup);
  }, [volumePerMuscleGroup]);

  // Get volume recommendations (async)
  const [recommendations, setRecommendations] = useState<Map<string, MuscleGroupVolumeRecommendation>>(new Map());

  useEffect(() => {
    if (!isGuidelineCat) {
      setRecommendations(new Map());
      return;
    }

    const loadRecommendations = async () => {
      const recs = new Map<string, MuscleGroupVolumeRecommendation>();
      const normalizedDifficulty = programDifficulty.toLowerCase();

      for (const [muscleGroup, currentSets] of volumePerMuscleGroup.entries()) {
        const isPriority = muscleGroup === priorityMuscleGroup;
        const recommendation = await getVolumeRecommendationForMuscleGroup(
          muscleGroup,
          currentSets,
          programCategory,
          normalizedDifficulty,
          isPriority,
          daysPerWeek
        );
        recs.set(muscleGroup, recommendation);
      }

      setRecommendations(recs);
    };

    loadRecommendations();
  }, [
    volumePerMuscleGroup,
    programCategory,
    programDifficulty,
    priorityMuscleGroup,
    daysPerWeek,
    isGuidelineCat,
  ]);

  // Get status color
  const getStatusColor = (status: string) => {
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

  // Calculate progress percentage
  const getProgressPercentage = (
    current: number,
    min: number,
    optimal: number,
    max: number
  ): number => {
    if (current < min) return (current / min) * 50;
    if (current <= optimal) return 50 + ((current - min) / (optimal - min)) * 30;
    if (current <= max) return 80 + ((current - optimal) / (max - optimal)) * 15;
    return Math.min(100, 95 + ((current - max) / max) * 5);
  };

  // Get recommendation text
  const getRecommendationText = (rec: MuscleGroupVolumeRecommendation): string => {
    if (programCategory === "Hypertrophy") {
      if (rec.isPriority) {
        return `${rec.recommendedMin}-${rec.recommendedOptimal} sets/week`;
      } else {
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

  // Aggregate all blocks from all templates for the modal
  const allBlocks: WorkoutBlock[] = useMemo(() => {
    const blocks: WorkoutBlock[] = [];
    templates.forEach((template) => {
      if (template.blocks && Array.isArray(template.blocks)) {
        blocks.push(...template.blocks);
      }
    });
    return blocks;
  }, [templates]);

  return (
    <>
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
                  Volume insights
                </span>
                <div className="text-sm font-semibold fc-text-primary">
                  Program Volume Calculator
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
                      setDaysPerWeek(Math.max(2, Math.min(7, value)));
                    }}
                    className="rounded-lg w-20 fc-glass-soft border border-[color:var(--fc-glass-border)]"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs font-medium fc-text-subtle mb-1 block">
                    Templates in Schedule
                  </Label>
                  <div className="text-sm font-semibold fc-text-primary">
                    {schedule.length} entries
                  </div>
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
                      {" "}({volumePerMuscleGroup.get(priorityMuscleGroup)?.toFixed(1)} sets/week avg)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Muscle Group Breakdown */}
            {sortedMuscleGroups.length > 0 ? (
              <div className="space-y-3">
                <Label className="text-xs font-semibold fc-text-primary block">
                  Average Weekly Volume (across all weeks)
                </Label>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {sortedMuscleGroups.map(([muscleGroup, currentSets]) => {
                    const rec = recommendations.get(muscleGroup);
                    const isPriority = muscleGroup === priorityMuscleGroup;

                    if (!rec) {
                      return (
                        <div
                          key={muscleGroup}
                          className="p-3 rounded-2xl border border-[color:var(--fc-glass-border)] fc-glass-soft"
                        >
                          <div className="flex items-center justify-between">
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
                              {currentSets.toFixed(1)} sets/week
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
                              {currentSets.toFixed(1)} sets
                            </span>
                            <span className={`fc-pill fc-pill-glass text-xs ${getStatusColor(rec.status)}`}>
                              {rec.status}
                            </span>
                          </div>
                        </div>

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
                                `+${Math.max(0, rec.recommendedMin - currentSets).toFixed(1)} sets needed`}
                              {rec.status === "high" &&
                                `Consider reducing by ${(currentSets - rec.recommendedMax).toFixed(1)} sets`}
                              {rec.status === "excessive" &&
                                `Reduce by ${(currentSets - rec.recommendedMax).toFixed(1)}+ sets`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-[color:var(--fc-glass-border)] text-center fc-glass-soft">
                <p className="text-sm fc-text-dim">
                  {schedule.length === 0
                    ? "Add templates to program schedule to see volume calculations"
                    : "No exercises found in templates"}
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
      </div>

      {/* Details Modal */}
      <VolumeDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        blocks={allBlocks}
        category={programCategory}
        difficulty={programDifficulty}
        daysPerWeek={daysPerWeek}
        excludeFromRecommendations={false}
      />
    </>
  );
}
