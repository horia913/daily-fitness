"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Calendar,
  BookOpen,
  Play,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService, {
  ProgramSchedule,
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Program {
  id: string;
  name: string;
  description: string;
  duration_weeks: number;
}

interface ProgramWeek {
  week_number: number;
  workouts: Array<{
    id: string;
    name: string;
    description: string;
    estimated_duration: number;
  }>;
}

function ProgramDetailsContent() {
  const { id } = useParams();
  const router = useRouter();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();
  const [program, setProgram] = useState<Program | null>(null);
  const [weeks, setWeeks] = useState<ProgramWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProgramDetails(id as string);
    }
  }, [id]);

  const loadProgramDetails = async (programId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get program details using direct query (getProgram method doesn't exist, only getPrograms)
      const { data: programData, error: programError } = await supabase
        .from("workout_programs")
        .select("id, name, description, duration_weeks")
        .eq("id", programId)
        .single();

      if (programError || !programData) {
        console.error("Error fetching program:", programError);
        setError("Failed to load program details");
        return;
      }

      setProgram({
        id: programData.id,
        name: programData.name,
        description: programData.description || "",
        duration_weeks: programData.duration_weeks,
      });

      // Get program schedule using service method (replaces program_weeks query)
      const schedule = await WorkoutTemplateService.getProgramSchedule(
        programId
      );

      if (!schedule || schedule.length === 0) {
        setWeeks([]);
        return;
      }

      // Group schedule by week_number and collect template details
      const weeksMap = new Map<number, ProgramWeek>();

      for (const scheduleItem of schedule) {
        const weekNum = scheduleItem.week_number || 1;

        if (!weeksMap.has(weekNum)) {
          weeksMap.set(weekNum, {
            week_number: weekNum,
            workouts: [],
          });
        }

        // Get template details if template_id exists
        if (scheduleItem.template_id) {
          const { data: templateData } = await supabase
            .from("workout_templates")
            .select("id, name, description, estimated_duration")
            .eq("id", scheduleItem.template_id)
            .single();

          if (templateData) {
            const week = weeksMap.get(weekNum)!;
            // Avoid duplicates
            if (
              !week.workouts.find((w) => w.id === templateData.id)
            ) {
              week.workouts.push({
                id: templateData.id,
                name: templateData.name,
                description: templateData.description || "",
                estimated_duration: templateData.estimated_duration || 0,
              });
            }
          }
        }
      }

      // Convert map to array and sort by week number
      const weeksData = Array.from(weeksMap.values()).sort(
        (a, b) => a.week_number - b.week_number
      );

      setWeeks(weeksData);
    } catch (error) {
      console.error("Error loading program details:", error);
      setError("Failed to load program details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AnimatedBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard elevation={2} className="p-8 text-center">
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4"
              style={{
                borderColor: `${getSemanticColor("trust").primary}40`,
                borderTopColor: "transparent",
              }}
            />
            <p
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              Loading program details...
            </p>
          </GlassCard>
        </div>
      </AnimatedBackground>
    );
  }

  if (error || !program) {
    return (
      <AnimatedBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard elevation={2} className="p-8 text-center">
            <p className="text-red-500 mb-4">{error || "Program not found"}</p>
            <Button onClick={() => router.back()} variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </GlassCard>
        </div>
      </AnimatedBackground>
    );
  }

  const totalWorkouts = weeks.reduce(
    (sum, week) => sum + week.workouts.length,
    0
  );

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6 relative z-10">
          {/* Back Button */}
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Program Header */}
          <GlassCard elevation={3} className="p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: getSemanticColor("success").gradient,
                    boxShadow: `0 4px 12px ${
                      getSemanticColor("success").primary
                    }30`,
                  }}
                >
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1
                    className="text-3xl font-bold mb-3 break-words"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    {program.name}
                  </h1>
                  {program.description && (
                    <p
                      className="leading-relaxed"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(0,0,0,0.7)",
                      }}
                    >
                      {program.description}
                    </p>
                  )}
                </div>
              </div>

              <div
                className="px-4 py-2 rounded-xl flex items-center gap-2 flex-shrink-0"
                style={{
                  background: `${getSemanticColor("warning").primary}20`,
                }}
              >
                <Calendar
                  className="w-5 h-5"
                  style={{ color: getSemanticColor("warning").primary }}
                />
                <span
                  className="font-semibold"
                  style={{ color: getSemanticColor("warning").primary }}
                >
                  {program.duration_weeks} weeks
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <GlassCard elevation={2} className="p-5 text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{
                  background: `${getSemanticColor("trust").primary}20`,
                }}
              >
                <Calendar
                  className="w-6 h-6"
                  style={{ color: getSemanticColor("trust").primary }}
                />
              </div>
              <AnimatedNumber
                value={program.duration_weeks}
                className="text-3xl font-bold"
                color={isDark ? "#fff" : "#1A1A1A"}
              />
              <p
                className="text-xs mt-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                Weeks
              </p>
            </GlassCard>

            <GlassCard elevation={2} className="p-5 text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{
                  background: `${getSemanticColor("success").primary}20`,
                }}
              >
                <Dumbbell
                  className="w-6 h-6"
                  style={{ color: getSemanticColor("success").primary }}
                />
              </div>
              <AnimatedNumber
                value={totalWorkouts}
                className="text-3xl font-bold"
                color={isDark ? "#fff" : "#1A1A1A"}
              />
              <p
                className="text-xs mt-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                Workouts
              </p>
            </GlassCard>

            <GlassCard elevation={2} className="p-5 text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{
                  background: `${getSemanticColor("warning").primary}20`,
                }}
              >
                <Clock
                  className="w-6 h-6"
                  style={{ color: getSemanticColor("warning").primary }}
                />
              </div>
              <AnimatedNumber
                value={weeks.reduce(
                  (sum, week) =>
                    sum +
                    week.workouts.reduce((s, w) => s + w.estimated_duration, 0),
                  0
                )}
                className="text-3xl font-bold"
                color={isDark ? "#fff" : "#1A1A1A"}
              />
              <p
                className="text-xs mt-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                Total Minutes
              </p>
            </GlassCard>
          </div>

          {/* Program Weeks */}
          <GlassCard elevation={2} className="p-6">
            <h3
              className="text-lg font-bold mb-6 flex items-center gap-2"
              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
            >
              <BookOpen className="w-5 h-5" />
              Program Structure
            </h3>

            {weeks.length === 0 ? (
              <p
                className="text-center py-8"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                No workout schedule found for this program.
              </p>
            ) : (
              <div className="space-y-6">
                {weeks.map((week) => (
                  <div
                    key={week.week_number}
                    className="pb-6 last:pb-0"
                    style={{
                      borderBottom:
                        weeks.indexOf(week) !== weeks.length - 1
                          ? `1px solid ${
                              isDark
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.1)"
                            }`
                          : "none",
                    }}
                  >
                    <h4
                      className="font-bold text-lg mb-4"
                      style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                    >
                      Week {week.week_number}
                    </h4>

                    {week.workouts.length === 0 ? (
                      <p
                        className="text-sm"
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(0,0,0,0.5)",
                        }}
                      >
                        No workouts scheduled for this week.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {week.workouts.map((workout) => (
                          <div
                            key={workout.id}
                            className="p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            style={{
                              background: isDark
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(0,0,0,0.03)",
                              border: `1px solid ${
                                isDark
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.1)"
                              }`,
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <h5
                                className="font-semibold mb-1 break-words"
                                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                              >
                                {workout.name}
                              </h5>
                              {workout.description && (
                                <p
                                  className="text-sm break-words"
                                  style={{
                                    color: isDark
                                      ? "rgba(255,255,255,0.6)"
                                      : "rgba(0,0,0,0.6)",
                                  }}
                                >
                                  {workout.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div
                                className="px-3 py-1 rounded-lg flex items-center gap-2"
                                style={{
                                  background: isDark
                                    ? "rgba(255,255,255,0.1)"
                                    : "rgba(0,0,0,0.05)",
                                }}
                              >
                                <Clock
                                  className="w-3.5 h-3.5"
                                  style={{
                                    color: getSemanticColor("warning").primary,
                                  }}
                                />
                                <span
                                  className="text-xs font-semibold"
                                  style={{
                                    color: isDark
                                      ? "rgba(255,255,255,0.9)"
                                      : "rgba(0,0,0,0.9)",
                                  }}
                                >
                                  {workout.estimated_duration} min
                                </span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/client/workouts/${workout.id}/details`
                                  )
                                }
                                style={{
                                  background:
                                    getSemanticColor("trust").gradient,
                                  boxShadow: `0 4px 12px ${
                                    getSemanticColor("trust").primary
                                  }30`,
                                }}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Action Button */}
          <div className="text-center">
            <Button
              onClick={() => router.push("/client/workouts")}
              size="lg"
              className="rounded-xl px-8"
              style={{
                background: getSemanticColor("energy").gradient,
                boxShadow: `0 4px 12px ${getSemanticColor("energy").primary}30`,
              }}
            >
              <Play className="w-5 h-5 mr-2" />
              View All Workouts
            </Button>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}

export default function ProgramDetailsPage() {
  return (
    <ProtectedRoute requiredRole="client">
      <ProgramDetailsContent />
    </ProtectedRoute>
  );
}
