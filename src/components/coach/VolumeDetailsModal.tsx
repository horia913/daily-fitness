"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
  Target,
} from "lucide-react";
import type { WorkoutBlock } from "@/types/workoutBlocks";
import {
  calculateVolumePerMuscleGroup,
  detectPriorityMuscleGroup,
  getVolumeRecommendationForMuscleGroup,
  getRPVolumeLandmarks,
  getVolumeGuidelines,
  type MuscleGroupVolumeRecommendation,
} from "@/lib/coachGuidelinesService";

interface VolumeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: WorkoutBlock[];
  category: string;
  difficulty: string;
  daysPerWeek: number;
  excludeFromRecommendations: boolean;
}

export default function VolumeDetailsModal({
  isOpen,
  onClose,
  blocks,
  category,
  difficulty,
  daysPerWeek,
  excludeFromRecommendations,
}: VolumeDetailsModalProps) {
  // Calculate volume per muscle group
  const volumePerMuscleGroup = useMemo(() => {
    return calculateVolumePerMuscleGroup(blocks);
  }, [blocks]);

  // Detect priority muscle group
  const priorityMuscleGroup = useMemo(() => {
    return detectPriorityMuscleGroup(volumePerMuscleGroup);
  }, [volumePerMuscleGroup]);

  // Get volume recommendations (async)
  const [recommendations, setRecommendations] = useState<Map<string, MuscleGroupVolumeRecommendation>>(new Map());

  useEffect(() => {
    if (excludeFromRecommendations) {
      setRecommendations(new Map());
      return;
    }

    const loadRecommendations = async () => {
      const recs = new Map<string, MuscleGroupVolumeRecommendation>();
      const normalizedDifficulty = difficulty.toLowerCase();

      for (const [muscleGroup, currentSets] of volumePerMuscleGroup.entries()) {
        const isPriority = muscleGroup === priorityMuscleGroup;
        const recommendation = await getVolumeRecommendationForMuscleGroup(
          muscleGroup,
          currentSets,
          category,
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
    category,
    difficulty,
    priorityMuscleGroup,
    daysPerWeek,
    excludeFromRecommendations,
  ]);

  // Get status color
  const getStatusColor = (status: string) => {
    if (excludeFromRecommendations) {
      return "fc-text-subtle";
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
        return "fc-text-subtle";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    if (excludeFromRecommendations) {
      return <Info className="w-4 h-4" />;
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
        return <Info className="w-4 h-4" />;
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

  // Get RP landmarks info for Hypertrophy (async)
  const [rpLandmarksMap, setRpLandmarksMap] = useState<Map<string, any>>(new Map());
  const [standardGuideline, setStandardGuideline] = useState<any>(null);

  useEffect(() => {
    const loadGuidelineData = async () => {
      if (category === "Hypertrophy") {
        // Load RP landmarks for all muscle groups
        const landmarks = new Map();
        for (const [muscleGroup] of volumePerMuscleGroup.entries()) {
          const landmark = await getRPVolumeLandmarks(muscleGroup);
          if (landmark) {
            landmarks.set(muscleGroup, landmark);
          }
        }
        setRpLandmarksMap(landmarks);
        setStandardGuideline(null);
      } else {
        const guideline = await getVolumeGuidelines(category, difficulty.toLowerCase());
        setStandardGuideline(guideline);
        setRpLandmarksMap(new Map());
      }
    };

    loadGuidelineData();
  }, [category, difficulty, volumePerMuscleGroup]);

  const getRPInfo = (muscleGroup: string) => {
    if (category !== "Hypertrophy") return null;
    return rpLandmarksMap.get(muscleGroup) || null;
  };

  // Sort muscle groups by volume
  const sortedMuscleGroups = Array.from(volumePerMuscleGroup.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="fc-modal fc-card w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-6 pb-4 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3 text-2xl font-bold fc-text-primary">
            <div className="fc-icon-tile fc-icon-workouts">
              <Target className="w-5 h-5" />
            </div>
            Volume Details — {category}
          </div>
          <p className="fc-text-dim">
            Detailed breakdown of volume per muscle group with recommendations
          </p>
        </div>

          <div className="px-6 py-5 space-y-6">
          {/* Summary */}
          <div className="p-4 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs fc-text-subtle mb-1">
                  Total Muscle Groups
                </div>
                <div className="text-lg font-semibold fc-text-primary">
                  {volumePerMuscleGroup.size}
                </div>
              </div>
              <div>
                <div className="text-xs fc-text-subtle mb-1">
                  Priority Muscle
                </div>
                <div className="text-lg font-semibold fc-text-primary">
                  {priorityMuscleGroup || "None"}
                </div>
              </div>
              <div>
                <div className="text-xs fc-text-subtle mb-1">
                  Days/Week
                </div>
                <div className="text-lg font-semibold fc-text-primary">
                  {daysPerWeek}
                </div>
              </div>
              <div>
                <div className="text-xs fc-text-subtle mb-1">
                  Difficulty
                </div>
                <div className="text-lg font-semibold fc-text-primary">
                  {difficulty}
                </div>
              </div>
            </div>
          </div>

          {/* Guideline Info */}
          {category === "Hypertrophy" && !excludeFromRecommendations && (
            <div className="p-4 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 fc-text-workouts mt-0.5" />
                <div>
                  <h4 className="font-semibold fc-text-primary mb-2">
                    Using RP Volume Landmarks
                  </h4>
                  <p className="text-sm fc-text-dim">
                    Recommendations are based on Renaissance Periodization volume landmarks.
                    Priority muscles use full RP ranges (MEV-MAV-MRV), while non-priority
                    muscles use maintenance volume (MV) or 6 sets/week.
                  </p>
                </div>
              </div>
            </div>
          )}

          {category !== "Hypertrophy" && standardGuideline && !excludeFromRecommendations && (
            <div className="p-4 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 fc-text-workouts mt-0.5" />
                <div>
                  <h4 className="font-semibold fc-text-primary mb-2">
                    Standard Volume Guidelines
                  </h4>
                  <div className="text-sm fc-text-dim space-y-1">
                    <p>
                      Target: {standardGuideline.setsPerMuscleWeekMin}-{standardGuideline.setsPerMuscleWeekOptimal} sets/week
                    </p>
                    <p>
                      Reps: {standardGuideline.repsPerSetMin}-{standardGuideline.repsPerSetMax} per set
                    </p>
                    <p>
                      RIR: {standardGuideline.rirMin}-{standardGuideline.rirMax}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Muscle Group Details */}
          <div className="space-y-3">
            <h3 className="font-semibold fc-text-primary">Muscle Group Details</h3>
            {sortedMuscleGroups.map(([muscleGroup, currentSets]) => {
              const rec = recommendations.get(muscleGroup);
              const isPriority = muscleGroup === priorityMuscleGroup;
              const rpInfo = getRPInfo(muscleGroup);

              if (!rec) {
                return (
                  <div
                    key={muscleGroup}
                    className="p-4 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium fc-text-primary">
                          {muscleGroup}
                        </span>
                        {isPriority && (
                          <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                            ⭐ Priority
                          </span>
                        )}
                      </div>
                      <span className="font-semibold fc-text-primary">
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
                  className="p-4 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(rec.status)}
                        <span className="font-semibold fc-text-primary">
                          {muscleGroup}
                        </span>
                        {isPriority && (
                          <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                            ⭐ Priority
                          </span>
                        )}
                        {!excludeFromRecommendations && (
                          <span
                            className={`fc-pill fc-pill-glass text-xs ${getStatusColor(rec.status)}`}
                          >
                            {rec.status}
                          </span>
                        )}
                      </div>

                      {/* Current Volume */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm fc-text-dim">
                            Current Volume
                          </span>
                          <span
                            className={`text-lg font-bold ${getStatusColor(rec.status)}`}
                          >
                            {currentSets} sets/week
                          </span>
                        </div>
                        {!excludeFromRecommendations && (
                          <div className="fc-progress-track h-2">
                            <div
                              className="fc-progress-fill h-2"
                              style={{ width: `${Math.min(100, progressPercent)}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Recommendations */}
                      {!excludeFromRecommendations && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <div className="fc-text-subtle">Min</div>
                              <div className="font-semibold fc-text-primary">
                                {rec.recommendedMin}
                              </div>
                            </div>
                            <div>
                              <div className="fc-text-subtle">Optimal</div>
                              <div className="font-semibold fc-text-primary">
                                {rec.recommendedOptimal}
                              </div>
                            </div>
                            <div>
                              <div className="fc-text-subtle">Max</div>
                              <div className="font-semibold fc-text-primary">
                                {rec.recommendedMax}
                              </div>
                            </div>
                          </div>

                          {/* RP Landmarks for Hypertrophy */}
                          {category === "Hypertrophy" && rpInfo && (
                            <div className="mt-3 p-2 rounded border border-[color:var(--fc-glass-border)] fc-glass-soft">
                              <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span className="fc-text-subtle">MV:</span>
                                  <span className="fc-text-primary">{rpInfo.mv}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="fc-text-subtle">MEV:</span>
                                  <span className="fc-text-primary">{rpInfo.mev}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="fc-text-subtle">MAV:</span>
                                  <span className="fc-text-primary">
                                    {rpInfo.mavLow}-{rpInfo.mavHigh}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="fc-text-subtle">MRV:</span>
                                  <span className="fc-text-primary">{rpInfo.mrv}+</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Recommendations */}
                          {rec.status !== "optimal" && (
                            <div className="mt-2 p-2 rounded border border-[color:var(--fc-glass-border)] fc-glass-soft">
                              <div className={`text-xs ${getStatusColor(rec.status)}`}>
                                {rec.status === "below" && (
                                  <p>
                                    <strong>Recommendation:</strong> Add{" "}
                                    {Math.max(0, rec.recommendedMin - currentSets)} sets
                                    to reach minimum volume ({rec.recommendedMin} sets/week).
                                  </p>
                                )}
                                {rec.status === "high" && (
                                  <p>
                                    <strong>Recommendation:</strong> Consider reducing by{" "}
                                    {currentSets - rec.recommendedMax} sets to stay within
                                    optimal range (max {rec.recommendedMax} sets/week).
                                  </p>
                                )}
                                {rec.status === "excessive" && (
                                  <p>
                                    <strong>Warning:</strong> Volume is excessive. Reduce by{" "}
                                    {currentSets - rec.recommendedMax}+ sets to prevent
                                    overreaching (max {rec.recommendedMax} sets/week).
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {sortedMuscleGroups.length === 0 && (
            <div className="p-8 text-center rounded-xl border border-[color:var(--fc-glass-border)]">
              <p className="text-sm fc-text-dim">
                No exercises added yet. Add exercises to see volume calculations.
              </p>
            </div>
          )}
          </div>
        </div>
      </div>
  );
}
