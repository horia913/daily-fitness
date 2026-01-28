"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Calendar,
  Flame,
  Target,
  TrendingUp,
  ArrowLeft,
  Dumbbell,
} from "lucide-react";
import Link from "next/link";
import {
  fetchPersonalRecords,
  PersonalRecord,
  formatRecordDisplay,
  getRecordType,
} from "@/lib/personalRecords";

export default function PersonalRecordsPage() {
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

  const [loading, setLoading] = useState(true);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);

  useEffect(() => {
    if (user && !authLoading) {
      loadPersonalRecords();
    }
  }, [user, authLoading]);

  const loadPersonalRecords = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const records = await fetchPersonalRecords(user.id);
      setPersonalRecords(records);
    } catch (error) {
      console.error("Error loading personal records:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalRecords = personalRecords.length;
  const recentCount = personalRecords.filter((record) => record.isRecent).length;
  const bestWeight = totalRecords
    ? Math.max(...personalRecords.map((record) => record.weight ?? 0))
    : 0;
  const latestRecordDate = personalRecords[0]?.date;
  const recordTypeCounts = personalRecords.reduce(
    (acc, record) => {
      const type = getRecordType(record.weight, record.reps).type;
      acc[type] += 1;
      return acc;
    },
    { strength: 0, endurance: 0, power: 0 }
  );

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-24 pt-10 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-6xl">
              <div className="fc-glass fc-card p-8">
                <div className="animate-pulse space-y-6">
                  <div className="h-20 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`record-skeleton-${index}`}
                        className="h-28 rounded-2xl bg-[color:var(--fc-glass-highlight)]"
                      ></div>
                    ))}
                  </div>
                  <div className="h-72 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Link href="/client/progress">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="fc-btn fc-btn-ghost h-10 w-10"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    Progress Hub
                  </span>
                  <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                    Personal Records
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Your best lifts and standout achievements.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="fc-glass-soft fc-card px-4 py-2 text-sm font-semibold text-[color:var(--fc-text-primary)]">
                  {totalRecords} PRs tracked
                </div>
                <div className="fc-glass-soft fc-card px-4 py-2 text-sm font-semibold text-[color:var(--fc-text-primary)]">
                  Best {bestWeight} kg
                </div>
              </div>
            </div>
          </GlassCard>

          {totalRecords > 0 ? (
            <>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)]">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">Total PRs</p>
                      <p className="text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                        {totalRecords}
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-[0_8px_18px_rgba(244,63,94,0.35)]">
                      <Flame className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">Recent PRs</p>
                      <p className="text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                        {recentCount}
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-[0_8px_18px_rgba(59,130,246,0.35)]">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">Best Weight</p>
                      <p className="text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                        {bestWeight} kg
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_8px_18px_rgba(16,185,129,0.35)]">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">Latest PR</p>
                      <p className="text-base font-semibold text-[color:var(--fc-text-primary)]">
                        {latestRecordDate
                          ? new Date(latestRecordDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>

              <div className="mt-6 fc-glass fc-card p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                      Record Board
                    </h2>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Latest top performances across your lifts.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                      Strength {recordTypeCounts.strength}
                    </span>
                    <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                      Power {recordTypeCounts.power}
                    </span>
                    <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                      Endurance {recordTypeCounts.endurance}
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {personalRecords.map((record) => {
                    const recordType = getRecordType(record.weight, record.reps);
                    const recordDisplay = formatRecordDisplay(record.weight, record.reps);

                    return (
                      <div
                        key={record.id}
                        className={`fc-glass fc-card p-5 transition-all sm:p-6 ${
                          record.isRecent
                            ? "border border-[color:var(--fc-status-warning)]/40 bg-[color:var(--fc-status-warning)]/10"
                            : "border border-[color:var(--fc-glass-border)]"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                                recordType.type === "power"
                                  ? "bg-[color:var(--fc-status-error)]/15 text-[color:var(--fc-status-error)]"
                                  : recordType.type === "endurance"
                                  ? "bg-[color:var(--fc-status-success)]/15 text-[color:var(--fc-status-success)]"
                                  : "bg-[color:var(--fc-accent-blue)]/15 text-[color:var(--fc-accent-blue)]"
                              }`}
                            >
                              <Trophy className="h-6 w-6" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-xl font-semibold text-[color:var(--fc-text-primary)]">
                                {record.exerciseName}
                              </h3>
                              <p className="mt-1 text-sm text-[color:var(--fc-text-dim)]">
                                {recordDisplay}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                              {recordType.label}
                            </span>
                            {record.isRecent && (
                              <span className="fc-badge bg-[color:var(--fc-status-warning)] text-white">
                                <Flame className="mr-1 h-3 w-3" />
                                New
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                          <div className="fc-glass-soft fc-card p-3">
                            <p className="text-xs text-[color:var(--fc-text-subtle)]">Record</p>
                            <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                              {recordDisplay}
                            </p>
                          </div>
                          <div className="fc-glass-soft fc-card p-3">
                            <p className="text-xs text-[color:var(--fc-text-subtle)]">Weight</p>
                            <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                              {record.weight} kg
                            </p>
                          </div>
                          <div className="fc-glass-soft fc-card p-3">
                            <p className="text-xs text-[color:var(--fc-text-subtle)]">Reps</p>
                            <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                              {record.reps}
                            </p>
                          </div>
                          <div className="fc-glass-soft fc-card p-3">
                            <p className="text-xs text-[color:var(--fc-text-subtle)]">Date</p>
                            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-[color:var(--fc-text-primary)]">
                              <Calendar className="h-4 w-4 text-[color:var(--fc-text-subtle)]" />
                              {new Date(record.date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 fc-glass fc-card p-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500/20 to-amber-500/30 text-[color:var(--fc-accent-blue)]">
                <Trophy className="h-10 w-10 text-[color:var(--fc-accent-orange)]" />
              </div>
              <h3 className="mt-6 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                No Records Yet
              </h3>
              <p className="mt-2 text-sm text-[color:var(--fc-text-dim)]">
                Complete workouts to start building your personal records. We will
                automatically track your best lifts here.
              </p>
              <Link href="/client/workouts">
                <Button className="fc-btn fc-btn-primary mt-6">
                  <Dumbbell className="mr-2 h-5 w-5" />
                  Start a Workout
                </Button>
              </Link>
            </div>
          )}
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
