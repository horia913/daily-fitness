"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Dumbbell,
  Apple,
  Scale,
  ChevronDown,
  Leaf,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalWizard } from "@/components/goals/GoalWizard";
import { EditGoalModal } from "@/components/goals/EditGoalModal";
import type { GoalWizardCategory } from "@/lib/goalCreationService";
import { withTimeout } from "@/lib/withTimeout";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { getGoalStats as getGoalStatsFromService } from "@/lib/goalAdherenceService";
const PILLAR_SECTIONS: {
  id: Goal["pillar"];
  label: string;
  emoji: string;
  icon: LucideIcon;
}[] = [
  { id: "training", label: "Training", emoji: "🏋️", icon: Zap },
  { id: "nutrition", label: "Nutrition", emoji: "🍎", icon: Apple },
  { id: "checkins", label: "Body", emoji: "🧍", icon: Scale },
  { id: "lifestyle", label: "Lifestyle", emoji: "🌿", icon: Leaf },
];

/** Phase 0b Task 8.5: per-pillar icon color (tokens from `ui-system.css` §2.6 aliases). */
const PILLAR_SECTION_ICON_COLOR: Record<Goal["pillar"], string> = {
  training: "var(--fc-pillar-training)",
  nutrition: "var(--fc-pillar-nutrition)",
  checkins: "var(--fc-pillar-checkins)",
  lifestyle: "var(--fc-pillar-lifestyle)",
  general: "var(--fc-pillar-general)",
};

function sectionPillarForGoal(goal: Goal): Goal["pillar"] {
  const cat = goal.category as string;
  if (cat === "behavioral") return "lifestyle";
  switch (goal.category) {
    case "body_composition":
    case "weight_loss":
    case "muscle_gain":
      return "checkins";
    case "nutrition":
      return "nutrition";
    case "outcome":
      return "lifestyle";
    case "performance":
    case "strength":
    case "endurance":
    case "mobility":
      return "training";
    default:
      return goal.pillar;
  }
}

interface Goal {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  notes?: string | null;
  category:
    | "body_composition"
    | "performance"
    | "outcome"
    | "nutrition"
    /** Legacy rows (pre–Phase 1 migration) may still surface until backfilled */
    | "weight_loss"
    | "muscle_gain"
    | "strength"
    | "endurance"
    | "mobility"
    | "other";
  type?: "target" | "habit" | "milestone";
  target_value?: number;
  target_unit?: string;
  current_value?: number;
  start_date: string;
  target_date?: string;
  status: "active" | "in_progress" | "completed" | "paused" | "cancelled";
  priority: "low" | "medium" | "high";
  created_at: string;
  updated_at: string;
  progress_percentage?: number;
  goal_template_id?: string;
  pillar: "training" | "nutrition" | "lifestyle" | "checkins" | "general";
  goal_type?: string | null;
  goal_source_links?:
    | { source_type: string }
    | { source_type: string }[]
    | null;
}

function unwrapSourceType(goal: Goal): string | null {
  const raw = goal.goal_source_links;
  if (raw == null) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  return row?.source_type ?? null;
}

function goalHasAutoSync(goal: Goal): boolean {
  const t = unwrapSourceType(goal);
  return typeof t === "string" && t !== "manual";
}

export default function ClientGoals() {
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalWizardOpen, setGoalWizardOpen] = useState(false);
  const [goalWizardInitialCategory, setGoalWizardInitialCategory] =
    useState<GoalWizardCategory | null>(null);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "completed" | "paused" | "cancelled"
  >("all");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "priority" | "progress"
  >("newest");
  const [completedSectionOpen, setCompletedSectionOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fabPortalReady, setFabPortalReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldOpen = params.get("add") === "true";
    const pillar = params.get("category") as Goal["pillar"] | null;
    const map: Partial<Record<Goal["pillar"], GoalWizardCategory>> = {
      nutrition: "nutrition",
      checkins: "body_composition",
      lifestyle: "outcome",
    };
    if (!shouldOpen) return;
    const initial = pillar && map[pillar] ? map[pillar]! : null;
    setGoalWizardInitialCategory(initial);
    setGoalWizardOpen(true);
  }, []);

  useEffect(() => {
    setFabPortalReady(true);
  }, []);

  const loadGoals = useCallback(async () => {
    if (!user) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      await withTimeout(
        (async () => {
          const { data, error } = await supabase
            .from("goals")
            .select("*, goal_source_links(source_type)")
            .eq("client_id", user.id)
            .order("pillar", { ascending: true })
            .order("created_at", { ascending: false });

          if (error) throw error;

          const goalsList = data || [];
          // Fetch habit_logs once for all habit-type goals (client_id = user.id)
          const habitGoalStarts = goalsList
            .filter((g: Goal) => g.type === "habit" && g.start_date)
            .map((g: Goal) => g.start_date!);
          let habitLogsByDate: Set<string> = new Set();
          if (habitGoalStarts.length > 0) {
            const minStart = habitGoalStarts
              .reduce((a, b) => (a < b ? a : b))
              .slice(0, 10);
            const { data: logs } = await supabase
              .from("habit_logs")
              .select("log_date")
              .eq("client_id", user.id)
              .gte("log_date", minStart);
            if (logs?.length) {
              logs.forEach((r: { log_date: string }) => {
                const d =
                  typeof r.log_date === "string"
                    ? r.log_date.slice(0, 10)
                    : r.log_date;
                if (d) habitLogsByDate.add(d);
              });
            }
          }

          // Calculate progress for each goal
          const goalsWithProgress = goalsList.map((goal: Goal) => {
            let progressPercentage = 0;

            if (goal.target_value != null && goal.current_value != null) {
              progressPercentage = Math.min(
                (goal.current_value / goal.target_value) * 100,
                100,
              );
            } else if (goal.type === "habit") {
              // Habit progress: days with at least one completion in [start_date, today] / total days in period
              const start = goal.start_date
                ? new Date(goal.start_date)
                : new Date();
              const end = new Date();
              const totalDays = Math.max(
                1,
                Math.ceil(
                  (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
                ),
              );
              const startStr = start.toISOString().slice(0, 10);
              const endStr = end.toISOString().slice(0, 10);
              const daysWithHabit = [...habitLogsByDate].filter(
                (d) => d >= startStr && d <= endStr,
              ).length;
              progressPercentage = Math.min(
                100,
                Math.round((daysWithHabit / totalDays) * 100),
              );
            } else if (goal.type === "milestone") {
              // For milestone goals, calculate based on time progress
              if (goal.target_date) {
                const startDate = new Date(goal.start_date);
                const targetDate = new Date(goal.target_date);
                const now = new Date();
                const totalDays = Math.ceil(
                  (targetDate.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24),
                );
                const daysPassed = Math.ceil(
                  (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
                );
                progressPercentage = Math.min(
                  (daysPassed / totalDays) * 100,
                  100,
                );
              }
            }

            return {
              ...goal,
              progress_percentage: progressPercentage,
            };
          });

          setGoals(goalsWithProgress);
        })(),
        30000,
        "timeout",
      );
    } catch (error: any) {
      console.error("Error loading goals:", error);
      setGoals([]);
      setLoadError(
        error?.message === "timeout"
          ? "Loading took too long. Please try again."
          : error?.message || "Failed to load goals",
      );
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user]);

  // Update goal progress
  const updateGoalProgress = async (
    goalId: string,
    newCurrentValue: number,
  ) => {
    try {
      // Get goal to calculate progress percentage
      const { data: goal } = await supabase
        .from("goals")
        .select("target_value, status")
        .eq("id", goalId)
        .single();

      if (!goal || !goal.target_value) return;

      const progressPercent = Math.min(
        (newCurrentValue / goal.target_value) * 100,
        100,
      );
      const newStatus = progressPercent >= 100 ? "completed" : "active";

      const { error } = await supabase
        .from("goals")
        .update({
          current_value: newCurrentValue,
          progress_percentage: progressPercent,
          status: newStatus,
          completed_date:
            newStatus === "completed"
              ? new Date().toISOString().split("T")[0]
              : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", goalId);

      if (error) throw error;

      await loadGoals();
    } catch (error) {
      console.error("Error updating goal progress:", error);
      addToast({
        title: "Failed to update progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      loadGoals().finally(() => setLoading(false));
    }
  }, [user, loadGoals]);

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase.from("goals").delete().eq("id", goalId);

      if (error) throw error;

      await loadGoals();
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const openGoalWizard = (pillar: Goal["pillar"]) => {
    const map: Partial<Record<Goal["pillar"], GoalWizardCategory>> = {
      nutrition: "nutrition",
      checkins: "body_composition",
      lifestyle: "outcome",
    };
    setGoalWizardInitialCategory(map[pillar] ?? null);
    setGoalWizardOpen(true);
  };

  const filteredAndSortedGoals = (goalList: Goal[]) => {
    let filtered = goalList;

    // Apply status filter (category filter removed — grouping is by pillar now)
    if (filterStatus !== "all") {
      filtered = filtered.filter((goal) => {
        // Treat "in_progress" as "active" for filtering
        const normalizedStatus =
          goal.status === "in_progress" ? "active" : goal.status;
        return normalizedStatus === filterStatus;
      });
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        return filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      case "oldest":
        return filtered.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      case "priority":
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return filtered.sort(
          (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority],
        );
      case "progress":
        return filtered.sort(
          (a, b) => (b.progress_percentage || 0) - (a.progress_percentage || 0),
        );
      default:
        return filtered;
    }
  };

  const getGoalStats = () => {
    const total = goals.length;
    const active = goals.filter(
      (g) => g.status === "active" || g.status === "in_progress",
    ).length;
    const completed = goals.filter((g) => g.status === "completed").length;
    const avgProgress =
      total > 0
        ? Math.round(
            goals.reduce(
              (acc, goal) => acc + (goal.progress_percentage || 0),
              0,
            ) / total,
          )
        : 0;

    return { total, active, completed, avgProgress };
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="min-h-screen bg-gradient-to-br from-[color:var(--fc-bg-page)] to-[color:var(--fc-surface)] dark:from-[color:var(--fc-bg-page)] dark:to-[color:var(--fc-surface)]">
          <div className="p-4">
            <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 space-y-3 overflow-x-hidden">
              <PageSkeleton variant="dashboard" />
            </ClientPageShell>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (loadError) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="min-h-screen bg-gradient-to-br from-[color:var(--fc-bg-page)] to-[color:var(--fc-surface)] dark:from-[color:var(--fc-bg-page)] dark:to-[color:var(--fc-surface)] flex items-center justify-center p-4">
          <ClientPageShell className="max-w-lg mx-auto w-full px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
            <div className="py-8 px-4 text-center rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft">
              <p className="text-sm fc-text-dim mb-3">{loadError}</p>
              <Button
                type="button"
                onClick={() => {
                  setLoadError(null);
                  setLoading(true);
                  loadGoals();
                }}
                className="fc-btn fc-btn-primary h-10 text-sm"
              >
                Retry
              </Button>
            </div>
          </ClientPageShell>
        </div>
      </ProtectedRoute>
    );
  }

  const stats = getGoalStats();
  const goalStatsFromService = getGoalStatsFromService(goals);
  const completedGoalsList = goals.filter((g) => g.status === "completed");
  const activeGoalsList = goals.filter(
    (g) => g.status === "active" || g.status === "in_progress",
  );
  const activeFilterCount =
    (filterStatus !== "all" ? 1 : 0) + (sortBy !== "newest" ? 1 : 0);

  const getActiveGoalsForPillar = (pillar: Goal["pillar"]) => {
    let list = activeGoalsList.filter(
      (g) => sectionPillarForGoal(g) === pillar,
    );
    return filteredAndSortedGoals(list);
  };
  const getPillarStats = (pillar: Goal["pillar"]) => {
    const list = activeGoalsList.filter(
      (g) => sectionPillarForGoal(g) === pillar,
    );
    const count = list.length;
    const adherence =
      count > 0
        ? Math.round(
            list.reduce((sum, g) => sum + (g.progress_percentage ?? 0), 0) /
              count,
          )
        : 0;
    return { count, adherence };
  };

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden space-y-4">
          {/* Header */}
          <header>
            <h1 className="text-xl font-bold fc-text-primary tracking-tight mb-4">
              My Goals
            </h1>
            <div className="flex items-center justify-between gap-2 -mt-2 mb-1">
              <p className="text-sm fc-text-dim min-w-0">
                Set and track goals by pillar.
              </p>
              <button
                type="button"
                onClick={() => router.push("/client/goals/history")}
                className="shrink-0 text-xs font-semibold uppercase tracking-wider text-[color:var(--fc-accent-cyan)] hover:text-[color:var(--fc-accent-cyan)]/80"
              >
                History
              </button>
            </div>
          </header>

          {/* Overall stats */}
          <div className="rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-3">
            <div className="flex items-center justify-between gap-1">
              <div className="flex-1 min-w-0 text-center">
                <p className="text-base font-semibold fc-text-primary tabular-nums">
                  {stats.total}
                </p>
                <p className="text-[10px] uppercase tracking-wider fc-text-dim mt-0.5">
                  Total
                </p>
              </div>
              <div
                className="w-px h-8 bg-[color:var(--fc-glass-border)] shrink-0"
                aria-hidden
              />
              <div className="flex-1 min-w-0 text-center">
                <p className="text-base font-semibold fc-text-primary tabular-nums">
                  {goalStatsFromService.active}
                </p>
                <p className="text-[10px] uppercase tracking-wider fc-text-dim mt-0.5">
                  Active
                </p>
              </div>
              <div
                className="w-px h-8 bg-[color:var(--fc-glass-border)] shrink-0"
                aria-hidden
              />
              <div className="flex-1 min-w-0 text-center">
                <p className="text-base font-semibold fc-text-primary tabular-nums">
                  {stats.completed}
                </p>
                <p className="text-[10px] uppercase tracking-wider fc-text-dim mt-0.5">
                  Completed
                </p>
              </div>
              <div
                className="w-px h-8 bg-[color:var(--fc-glass-border)] shrink-0"
                aria-hidden
              />
              <div className="flex-1 min-w-0 text-center">
                <p className="text-base font-semibold fc-text-primary tabular-nums">
                  {goalStatsFromService.overallAdherence}%
                </p>
                <p className="text-[10px] uppercase tracking-wider fc-text-dim mt-0.5">
                  Adherence
                </p>
              </div>
            </div>
          </div>

          {/* Status and Sort chips */}
          <section className="rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-3">
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="w-full flex items-center justify-between py-2 mb-3 text-left"
              aria-expanded={filtersOpen}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] fc-text-subtle">
                  Filters
                </span>
                {activeFilterCount > 0 ? (
                  <span className="text-[10px] text-[color:var(--fc-accent-cyan)]/70">
                    {activeFilterCount} active
                  </span>
                ) : null}
              </div>
              <ChevronDown
                className={`w-4 h-4 fc-text-dim transition-transform duration-200 ${
                  filtersOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {filtersOpen ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[color:var(--fc-accent-cyan)]/80 mb-2">
                    Status
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { value: "all", label: "All" },
                        { value: "active", label: "Active" },
                        { value: "completed", label: "Completed" },
                        { value: "paused", label: "Paused" },
                        { value: "cancelled", label: "Cancelled" },
                      ] as const
                    ).map((option) => {
                      const isActive = filterStatus === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFilterStatus(option.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.1em] border transition-colors ${
                            isActive
                              ? "border-[color-mix(in_srgb,var(--fc-accent-cyan)_40%,transparent)] bg-[color-mix(in_srgb,var(--fc-accent-cyan)_15%,transparent)] text-[color:var(--fc-accent-cyan)]"
                              : "border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] fc-text-dim hover:fc-text-primary"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[color:var(--fc-accent-cyan)]/80 mb-2">
                    Sort
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { value: "newest", label: "Newest" },
                        { value: "oldest", label: "Oldest" },
                        { value: "priority", label: "Priority" },
                        { value: "progress", label: "Progress" },
                      ] as const
                    ).map((option) => {
                      const isActive = sortBy === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSortBy(option.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.1em] border transition-colors ${
                            isActive
                              ? "border-[color-mix(in_srgb,var(--fc-accent-cyan)_40%,transparent)] bg-[color-mix(in_srgb,var(--fc-accent-cyan)_15%,transparent)] text-[color:var(--fc-accent-cyan)]"
                              : "border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] fc-text-dim hover:fc-text-primary"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* Pillar sections */}
          {PILLAR_SECTIONS.map(({ id: pillarId, label, icon: PillarIcon }) => {
            const pillarGoalsList = getActiveGoalsForPillar(pillarId);
            const pillarStat = getPillarStats(pillarId);
            const count = pillarStat?.count ?? 0;
            const adherence = pillarStat?.adherence ?? 0;
            return (
              <section
                key={pillarId}
                className="rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-4"
              >
                <p className="text-[10px] uppercase tracking-wider text-[color:var(--fc-accent-cyan)]/80 mb-1">
                  {label} pillar
                </p>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold tracking-tight fc-text-primary">
                    <PillarIcon
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: PILLAR_SECTION_ICON_COLOR[pillarId] }}
                    />
                    <span className="truncate">{label}</span>
                  </h2>
                  {count > 0 ? (
                    <span className="shrink-0 text-xs tabular-nums fc-text-dim">
                      {count} · {adherence}%
                    </span>
                  ) : null}
                </div>
                {pillarGoalsList.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <p className="text-sm fc-text-dim mb-1">
                      No goals in this pillar yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => openGoalWizard(pillarId)}
                      className="text-xs font-semibold uppercase tracking-wider text-[color:var(--fc-accent-cyan)] hover:text-[color:var(--fc-accent-cyan)]/80"
                    >
                      + Add {label} Goal
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 mb-3">
                      {pillarGoalsList.map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal as Goal}
                          isAutoTracked={goalHasAutoSync(goal)}
                          onDelete={handleDeleteGoal}
                          onUpdate={updateGoalProgress}
                          onEdit={(g) => setEditGoal(g as Goal)}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => openGoalWizard(pillarId)}
                      className="text-xs font-semibold uppercase tracking-wider text-[color:var(--fc-accent-cyan)] hover:text-[color:var(--fc-accent-cyan)]/80"
                    >
                      + Add {label} Goal
                    </button>
                  </>
                )}
              </section>
            );
          })}

          <GoalWizard
            open={goalWizardOpen}
            onClose={() => {
              setGoalWizardOpen(false);
              setGoalWizardInitialCategory(null);
            }}
            initialCategory={goalWizardInitialCategory}
            onSuccess={() => void loadGoals()}
          />

          <EditGoalModal
            open={editGoal != null}
            goal={
              editGoal
                ? {
                    id: editGoal.id,
                    client_id: editGoal.client_id,
                    title: editGoal.title,
                    target_value: editGoal.target_value ?? null,
                    target_date: editGoal.target_date ?? null,
                    notes: editGoal.notes ?? null,
                    description: editGoal.description ?? null,
                    status: editGoal.status,
                  }
                : null
            }
            onClose={() => setEditGoal(null)}
            onSaved={() => void loadGoals()}
          />

          {/* Completed goals: collapsible */}
          <section className="overflow-hidden rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft">
            <button
              type="button"
              onClick={() => setCompletedSectionOpen((o) => !o)}
              className="w-full flex items-center justify-between py-3 px-4 hover:bg-[color:var(--fc-glass-highlight)] transition-colors text-left"
            >
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[color:var(--fc-accent-cyan)]/80">
                  Archive
                </p>
                <h3 className="text-sm font-semibold fc-text-primary tracking-tight">
                  Completed goals
                </h3>
                <p className="text-xs fc-text-dim mt-0.5">
                  {completedGoalsList.length} completed
                </p>
              </div>
              <ChevronDown
                className={`w-5 h-5 shrink-0 fc-text-subtle transition-transform duration-300 ${completedSectionOpen ? "rotate-180" : ""}`}
              />
            </button>
            <div className={completedSectionOpen ? "block" : "hidden"}>
              <div className="px-4 pb-4 pt-0 space-y-3">
                {completedGoalsList.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <p className="text-sm fc-text-dim">
                      No completed goals yet.
                    </p>
                  </div>
                ) : (
                  filteredAndSortedGoals(completedGoalsList).map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal as Goal}
                      isAutoTracked={goalHasAutoSync(goal)}
                      compact
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        </ClientPageShell>
      </AnimatedBackground>

      {/*
        Phase 0b Task 6 — "Add new goal" FAB migration.
        Spec ref: design-system-v4 §6.21 Floating Action Button.
        Was: <div className="fixed bottom-24 right-4 z-40 pointer-events-auto">
               <button className="fc-fab group">
                 <Plus className="w-8 h-8 text-white" /> ...
        Now:  the wrapper <div> is removed; the button uses the v4 atomic
              `fab-action` class (lime gradient, dark glyph #061018, position
              fixed, z-index 40, bottom 96px) directly. The Plus glyph drops
              `text-white` so it inherits the dark glyph color from
              `.fab-action`. The `group` class stays — required for the
              existing hover-tooltip span behavior.
        Note: createPortal still mounts to document.body; `position: fixed`
              positions to the viewport regardless of portal target.
        Phase 0b Task 6.5 cleanup: removed stale Plus `w-8 h-8` classes
              because `.fab-action svg` enforces the rendered 24px size.
      */}
      {fabPortalReady
        ? createPortal(
            <button
              type="button"
              onClick={() => {
                setGoalWizardInitialCategory(null);
                setGoalWizardOpen(true);
              }}
              className="fab-action group"
              aria-label="Add new goal"
            >
              <Plus />
              <span className="absolute right-full mr-3 fc-glass border border-[color:var(--fc-glass-border)] px-3 py-1.5 rounded-xl text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap fc-text-primary">
                Add goal
              </span>
            </button>,
            document.body,
          )
        : null}
    </ProtectedRoute>
  );
}
