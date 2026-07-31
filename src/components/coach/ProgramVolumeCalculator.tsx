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
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { WorkoutSetEntry } from "@/types/workoutSetEntries";
import {
  calculateVolumePerMuscleGroup,
  detectPriorityMuscleGroup,
  getVolumeRecommendationForMuscleGroup,
  isGuidelineCategory,
  type MuscleGroupVolumeRecommendation,
} from "@/lib/coachGuidelinesService";
import css from "@/components/coach/programs/programEditV1.module.css";

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
  blocks?: WorkoutSetEntry[];
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

function severityBadge(
  status: MuscleGroupVolumeRecommendation["status"],
  rec: MuscleGroupVolumeRecommendation,
  currentSets: number,
  programCat: string,
): { label: string; bg: string; fg: string } {
  if (status === "excessive")
    return { label: "Excessive", bg: "rgba(255,90,95,0.12)", fg: "#FF5A5F" };
  if (status === "below")
    return { label: "Under target", bg: "rgba(245,194,66,0.12)", fg: "#F5C242" };
  if (status === "high") {
    const maintOnly =
      !rec.isPriority &&
      programCat === "Hypertrophy" &&
      rec.maintenanceVolume === 0 &&
      currentSets > 0;
    return {
      label: maintOnly ? "Above maint." : "Above target",
      bg: "rgba(245,194,66,0.12)",
      fg: "#F5C242",
    };
  }
  return { label: "On target", bg: "rgba(52,211,153,0.12)", fg: "#34D399" };
}

function VolumeBar({
  rec,
  currentSets,
}: {
  rec: MuscleGroupVolumeRecommendation;
  currentSets: number;
}) {
  const maxScale = Math.max(rec.recommendedMax, currentSets, 0.0001);
  const targetPct = Math.min(100, (rec.recommendedMax / maxScale) * 100);
  const fillPct =
    rec.status === "excessive"
      ? 100
      : Math.min(100, (currentSets / rec.recommendedMax) * 100 || 0);
  const overflowFrac =
    rec.status === "excessive" ? Math.min(0.45, (currentSets - rec.recommendedMax) / maxScale) : 0;

  return (
    <div className="relative w-full h-2 rounded-full overflow-hidden bg-white/[0.04]">
      {rec.status === "below" ? (
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${fillPct}%`,
            background: "linear-gradient(90deg, #F5C242, #C5FF4A)",
            opacity: 0.85,
          }}
        />
      ) : rec.status === "high" ? (
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${Math.min(100, fillPct)}%`,
            background: "linear-gradient(90deg, #F5C242, #C5FF4A)",
            opacity: 0.9,
          }}
        />
      ) : (
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${Math.min(100, fillPct)}%`,
            background: "linear-gradient(90deg, #7FE89A, #C5FF4A)",
          }}
        />
      )}
      {rec.status === "excessive" && overflowFrac > 0 ? (
        <div
          className="absolute top-0 h-full border-l border-[#0E1F2E]"
          style={{
            left: `${100 - overflowFrac * 100}%`,
            width: `${overflowFrac * 100}%`,
            background:
              "repeating-linear-gradient(-45deg, #b91c1c, #b91c1c 4px, #7f1d1d 4px, #7f1d1d 8px)",
          }}
        />
      ) : null}
      {rec.status !== "excessive" ? (
        <div
          className="absolute top-0 bottom-0 w-[1.5px] bg-white/40 pointer-events-none"
          style={{ left: `${targetPct}%` }}
        />
      ) : null}
    </div>
  );
}

export default function ProgramVolumeCalculator({
  programId: _programId,
  programCategory,
  programDifficulty,
  schedule,
  templates,
  className,
}: ProgramVolumeCalculatorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [daysPerWeek, setDaysPerWeek] = useState(3);

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

  const statusIconSmall = (status: MuscleGroupVolumeRecommendation["status"]) => {
    const wrap = "w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0";
    switch (status) {
      case "optimal":
        return (
          <span className={wrap} style={{ background: "rgba(52,211,153,0.12)" }}>
            <CheckCircle2 className="w-3 h-3 text-[#34D399]" />
          </span>
        );
      case "below":
        return (
          <span className={wrap} style={{ background: "rgba(245,194,66,0.12)" }}>
            <TrendingDown className="w-3 h-3 text-[#F5C242]" />
          </span>
        );
      case "high":
        return (
          <span className={wrap} style={{ background: "rgba(245,194,66,0.12)" }}>
            <TrendingUp className="w-3 h-3 text-[#F5C242]" />
          </span>
        );
      case "excessive":
        return (
          <span className={wrap} style={{ background: "rgba(255,90,95,0.12)" }}>
            <AlertCircle className="w-3 h-3 text-[#FF5A5F]" />
          </span>
        );
      default:
        return <span className={wrap} style={{ background: "rgba(255,255,255,0.06)" }} />;
    }
  };

  return (
    <div
      className={`rounded-[18px] border border-[rgba(255,255,255,0.08)] ${css.wrap} ${className || ""}`}
      style={{ background: "var(--pe-card)" }}
    >
      <div className="p-[14px]">
        <div
          className="flex items-start justify-between gap-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(167,139,250,0.12)" }}
            >
              <BarChart3 className="w-4 h-4 text-[#A78BFA]" />
            </div>
            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A78BFA]"
                style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
              >
                Volume insights
              </p>
              <p
                className="text-sm font-semibold text-[var(--pe-t1)] mt-0.5"
                style={{ fontFamily: "var(--f-headline, Bricolage Grotesque, sans-serif)" }}
              >
                Program Volume Calculator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {volumePerMuscleGroup.size > 0 ? (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium text-[var(--fc-accent)]"
                style={{ background: "rgba(34, 211, 238, 0.12)" }}
              >
                {volumePerMuscleGroup.size} muscle groups
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-auto text-[var(--pe-t2)] hover:text-[var(--pe-t1)]"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="px-[14px] pb-[14px] space-y-4">
          <div
            className="rounded-[11px] border border-[var(--pe-line-2)] grid grid-cols-2 gap-3 p-3"
            style={{ background: "var(--pe-card-2)" }}
          >
            <div>
              <Label
                className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--pe-t3)]"
                style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
              >
                Days/wk
              </Label>
              <Input
                type="number"
                min={2}
                max={7}
                value={daysPerWeek}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10) || 3;
                  setDaysPerWeek(Math.max(2, Math.min(7, value)));
                }}
                className="h-9 w-[60px] text-center rounded-lg border text-base font-bold"
                style={{
                  fontFamily: "var(--f-display, sans-serif)",
                  background: "var(--pe-card)",
                  borderColor: "rgba(255,255,255,0.08)",
                  color: "var(--pe-t1)",
                }}
              />
            </div>
            <div className="flex flex-col items-end justify-end text-right">
              <Label
                className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--pe-t3)]"
                style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
              >
                Templates in schedule
              </Label>
              <div
                className="text-base font-bold text-[var(--pe-t1)]"
                style={{ fontFamily: "var(--f-display, sans-serif)" }}
              >
                {schedule.length} entries
              </div>
            </div>
          </div>

          {priorityMuscleGroup ? (
            <div
              className="rounded-[11px] border px-3 py-3 flex items-center gap-2"
              style={{
                borderColor: "rgba(34, 211, 238, 0.18)",
                background: "linear-gradient(90deg, rgba(34, 211, 238, 0.12), transparent)",
                boxShadow: "inset 3px 0 0 var(--fc-group-c)",
              }}
            >
              <Target className="w-4 h-4 text-[var(--fc-accent)] shrink-0" />
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--fc-accent)] leading-snug"
                style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
              >
                Priority muscle: {priorityMuscleGroup} ·{" "}
                {volumePerMuscleGroup.get(priorityMuscleGroup)?.toFixed(1)} sets/wk avg
              </p>
            </div>
          ) : null}

          {sortedMuscleGroups.length > 0 ? (
            <div className="space-y-3">
              <p
                className="text-[12.5px] font-semibold text-[var(--pe-t1)]"
                style={{ fontFamily: "var(--f-headline, Bricolage Grotesque, sans-serif)" }}
              >
                Average weekly volume
              </p>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-0.5">
                {sortedMuscleGroups.map(([muscleGroup, currentSets]) => {
                  const rec = recommendations.get(muscleGroup);
                  const isPriority = muscleGroup === priorityMuscleGroup;
                  if (!rec) {
                    return (
                      <div
                        key={muscleGroup}
                        className="rounded-xl border border-[rgba(255,255,255,0.08)] p-3"
                        style={{ background: "var(--pe-card-2)" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12.5px] font-semibold text-[var(--pe-t1)]">{muscleGroup}</span>
                          <span
                            className="text-sm font-bold text-[var(--pe-t1)]"
                            style={{ fontFamily: "var(--f-display, sans-serif)" }}
                          >
                            {currentSets.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  const badge = severityBadge(rec.status, rec, currentSets, programCategory);
                  const targetRange =
                    programCategory === "Hypertrophy" && !rec.isPriority
                      ? `${rec.maintenanceVolume} maint.`
                      : `${rec.recommendedMin}–${rec.recommendedMax}`;

                  let footRight: { text: string; color: string } | null = null;
                  if (rec.status === "optimal")
                    footRight = { text: "Within range ✓", color: "#34D399" };
                  else if (rec.status === "below")
                    footRight = {
                      text: `+${Math.max(0, rec.recommendedMin - currentSets).toFixed(1)} below target`,
                      color: "#F5C242",
                    };
                  else if (rec.status === "high")
                    footRight = {
                      text: `+${(currentSets - rec.recommendedMax).toFixed(1)} above target`,
                      color: "#F5C242",
                    };
                  else if (rec.status === "excessive")
                    footRight = {
                      text: `Reduce by ${(currentSets - rec.recommendedMax).toFixed(1)}+ sets`,
                      color: "#FF5A5F",
                    };

                  return (
                    <div key={muscleGroup} className="space-y-2">
                      <div className="flex items-start gap-2">
                        {statusIconSmall(rec.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[12.5px] font-semibold text-[var(--pe-t1)]">{muscleGroup}</span>
                            {isPriority ? (
                              <span
                                className="rounded px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.08em]"
                                style={{
                                  fontFamily: "var(--f-mono, Geist Mono, monospace)",
                                  background: "rgba(245,194,66,0.12)",
                                  color: "#F5C242",
                                }}
                              >
                                Priority
                              </span>
                            ) : null}
                            <span className="flex-1" />
                            <span
                              className="text-sm font-bold tabular-nums"
                              style={{
                                fontFamily: "var(--f-display, sans-serif)",
                                color: "var(--pe-t1)",
                              }}
                            >
                              {currentSets.toFixed(1)}
                            </span>
                            <span
                              className="rounded px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.08em]"
                              style={{
                                fontFamily: "var(--f-mono, Geist Mono, monospace)",
                                background: badge.bg,
                                color: badge.fg,
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <div className="mt-2">
                            <VolumeBar rec={rec} currentSets={currentSets} />
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <span
                              className="text-[9.5px] text-[var(--pe-t3)]"
                              style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
                            >
                              Target: {targetRange} sets/wk
                            </span>
                            {footRight ? (
                              <span className="text-[9.5px] font-medium" style={{ color: footRight.color }}>
                                {footRight.text}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl border border-[rgba(255,255,255,0.08)] p-4 text-center"
              style={{ background: "var(--pe-card-2)" }}
            >
              <p className="text-sm text-[var(--pe-t3)]">
                {schedule.length === 0
                  ? "Add templates to program schedule to see volume calculations"
                  : "No exercises found in templates"}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
