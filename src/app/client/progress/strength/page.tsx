"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PsHero, PsSectionEyebrow, PsSegmented } from "@/components/client/progress-suite";
import ps from "@/components/client/progress-suite/progressSuiteV1.module.css";
import { cn } from "@/lib/utils";
import {
  getTopProgressions,
  getTrainedExercises,
  getExerciseProgressionsBatch,
  getExerciseProgression,
  isCompoundLift,
  getCompoundLiftDisplayName,
  type ExerciseProgression,
  type TrainedExercise,
  type StrengthTimeRange,
} from "@/lib/strengthAnalytics";
import { ExerciseProgressionChart } from "@/components/progress/ExerciseProgressionChart";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight } from "lucide-react";

function StrengthProgressPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const exerciseIdFromUrl = searchParams.get("exerciseId");
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<StrengthTimeRange>("3M");
  const [topProgressions, setTopProgressions] = useState<ExerciseProgression[]>([]);
  const [trainedExercises, setTrainedExercises] = useState<TrainedExercise[]>([]);
  const [compoundProgressions, setCompoundProgressions] = useState<ExerciseProgression[]>([]);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [progressionCache, setProgressionCache] = useState<Record<string, ExerciseProgression>>({});
  const [loadingProgression, setLoadingProgression] = useState<string | null>(null);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStrength = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [top, trained] = await Promise.all([
        getTopProgressions(user.id, 3, timeRange),
        getTrainedExercises(user.id),
      ]);
      setTopProgressions(top);
      setTrainedExercises(trained);
      const compound = trained.filter((ex) => isCompoundLift(ex.name));
      const compoundIds = compound.map((ex) => ex.id);
      const progressions =
        compoundIds.length > 0
          ? await getExerciseProgressionsBatch(user.id, compoundIds, timeRange)
          : [];
      setCompoundProgressions(
        progressions.filter(
          (p): p is ExerciseProgression =>
            p != null && p.dataPoints.length >= 2,
        ),
      );
      setProgressionCache({});
      setExpandedExerciseId(null);
    } catch (e) {
      console.error(e);
      setTopProgressions([]);
      setTrainedExercises([]);
      setCompoundProgressions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, timeRange]);

  useEffect(() => {
    if (!user?.id) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
    }, 20_000);
    void loadStrength().finally(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [loadStrength, user?.id]);

  useEffect(() => {
    if (!exerciseIdFromUrl || !user?.id) return;
    setExpandedExerciseId(exerciseIdFromUrl);
    void (async () => {
      setLoadingProgression(exerciseIdFromUrl);
      try {
        const prog = await getExerciseProgression(
          user.id,
          exerciseIdFromUrl,
          timeRange,
        );
        if (prog) {
          setProgressionCache((prev) => ({ ...prev, [exerciseIdFromUrl]: prog }));
        }
      } finally {
        setLoadingProgression(null);
      }
    })();
  }, [exerciseIdFromUrl, user?.id, timeRange]);

  const loadExerciseProgressionForExpand = async (exerciseId: string) => {
    if (!user?.id || progressionCache[exerciseId]) {
      setExpandedExerciseId(exerciseId);
      return;
    }
    setLoadingProgression(exerciseId);
    try {
      const prog = await getExerciseProgression(user.id, exerciseId, timeRange);
      if (prog) {
        setProgressionCache((prev) => ({ ...prev, [exerciseId]: prog }));
        setExpandedExerciseId(exerciseId);
      }
    } finally {
      setLoadingProgression(null);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
            <PageSkeleton variant="dashboard" />
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
          <div className={ps.psV1}>
            <PsHero
              glow="purple"
              onBack={() => router.push("/client/progress")}
              backAriaLabel="Back to progress hub"
              eyebrow="Performance · strength"
              eyebrowColor="#A78BFA"
              title="Strength Progress"
              subtitle="Estimated 1RM and exercise trends"
            >
              <PsSegmented
                ariaLabel="Strength time range"
                options={[
                  { value: "1M" as const, label: "1M" },
                  { value: "3M" as const, label: "3M" },
                  { value: "6M" as const, label: "6M" },
                  { value: "1Y" as const, label: "1Y" },
                  { value: "ALL" as const, label: "All" },
                ]}
                value={timeRange}
                onChange={setTimeRange}
              />
            </PsHero>

            {(topProgressions.length > 0 || trainedExercises.length > 0) && (
              <div className="mt-4 space-y-6">
                {compoundProgressions.length > 0 && (
                  <div className={ps.psChartCard}>
                    <PsSectionEyebrow accent="purple" className="mb-2">
                      Estimated 1RM — compound lifts
                    </PsSectionEyebrow>
                    <div className="grid grid-cols-2 gap-3">
                      {compoundProgressions.map((prog) => (
                        <div
                          key={prog.exerciseId}
                          className="rounded-xl border p-3"
                          style={{
                            borderColor: "var(--ps-line)",
                            background: "var(--ps-card-2)",
                          }}
                        >
                          <p
                            className={cn(ps.psFontBody, "truncate text-[11px]")}
                            style={{ color: "var(--ps-t3)" }}
                          >
                            {getCompoundLiftDisplayName(prog.exerciseName)}
                          </p>
                          <p
                            className={cn(ps.psFontDisplay, "text-lg font-bold tabular-nums")}
                            style={{ color: "var(--ps-t1)" }}
                          >
                            {prog.currentOneRM > 0
                              ? `${Math.round(prog.currentOneRM * 10) / 10} kg`
                              : "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {topProgressions.length > 0 && (
                  <div>
                    <PsSectionEyebrow accent="cyan" className="mb-2">
                      Biggest gains
                    </PsSectionEyebrow>
                    <div className="flex flex-col gap-4">
                      {topProgressions.map((prog) => (
                        <ExerciseProgressionChart
                          key={prog.exerciseId}
                          progression={prog}
                          compact
                          defaultTimeRange={timeRange}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div id="strength-exercises">
                  <PsSectionEyebrow accent="cyan" className="mb-2">
                    All exercises
                  </PsSectionEyebrow>
                  <div className={ps.psSearchWrap}>
                    <Input
                      type="text"
                      placeholder="Search exercises..."
                      value={exerciseSearchQuery}
                      onChange={(e) => setExerciseSearchQuery(e.target.value)}
                      className={cn(ps.psSearchInput, "pl-3")}
                    />
                  </div>
                  <div className="mt-2 space-y-2">
                    {trainedExercises
                      .filter(
                        (ex) =>
                          !exerciseSearchQuery ||
                          ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()),
                      )
                      .map((ex) => {
                        const isExpanded = expandedExerciseId === ex.id;
                        const cached = progressionCache[ex.id];
                        const lp = loadingProgression === ex.id;
                        return (
                          <div
                            key={ex.id}
                            className={ps.psChartCard}
                          >
                            <button
                              type="button"
                              className={ps.psAccRow}
                              onClick={() =>
                                isExpanded
                                  ? setExpandedExerciseId(null)
                                  : void loadExerciseProgressionForExpand(ex.id)
                              }
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 shrink-0" style={{ color: "var(--ps-t3)" }} />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--ps-t3)" }} />
                              )}
                              <span className={cn(ps.psFontBody, "font-semibold truncate")} style={{ color: "var(--ps-t1)" }}>
                                {ex.name}
                              </span>
                              <span className={cn(ps.psFontMono, "ml-auto text-[10px]")} style={{ color: "var(--ps-t3)" }}>
                                {ex.sessionCount} sessions
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="border-t p-3" style={{ borderColor: "var(--ps-line)" }}>
                                {lp && (
                                  <div className="flex justify-center py-6">
                                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-[color:var(--ps-cyan)] border-t-transparent" />
                                  </div>
                                )}
                                {!lp && cached && (
                                  <ExerciseProgressionChart
                                    progression={cached}
                                    defaultTimeRange={timeRange}
                                  />
                                )}
                                {!lp && !cached && (
                                  <p className={cn(ps.psFontBody, "py-6 text-center text-sm")} style={{ color: "var(--ps-t3)" }}>
                                    Need at least 2 sessions to show chart.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}

export default function StrengthProgressPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute requiredRole="client">
          <AnimatedBackground>
            <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
              <PageSkeleton variant="dashboard" />
            </ClientPageShell>
          </AnimatedBackground>
        </ProtectedRoute>
      }
    >
      <StrengthProgressPageInner />
    </Suspense>
  );
}
