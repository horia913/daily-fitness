"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Apple,
  Scale,
  Leaf,
  Zap,
  ChevronDown,
  ListFilter,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/contexts/AuthContext";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalWizard } from "@/components/goals/GoalWizard";
import { EditGoalModal } from "@/components/goals/EditGoalModal";
import type { GoalWizardCategory } from "@/lib/goalCreationService";
import { withTimeout } from "@/lib/withTimeout";
import { ClientPageShell, ConfirmActionDialog } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { getGoalStats as getGoalStatsFromService } from "@/lib/goalAdherenceService";
import {
  PsHero,
  PsSectionEyebrow,
  progressSuiteV1Styles as ps,
} from "@/components/client/progress-suite";
import { CheckinActionAddButton } from "@/components/client/check-ins/checkinSuite";
import { cn } from "@/lib/utils";

const PILLAR_SECTIONS: {
  id: Goal["pillar"];
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "training", label: "Training", icon: Zap },
  { id: "nutrition", label: "Nutrition", icon: Apple },
  { id: "checkins", label: "Body", icon: Scale },
  { id: "lifestyle", label: "Lifestyle", icon: Leaf },
];

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

type FilterStatus = "all" | "active" | "completed" | "paused" | "cancelled";
type SortBy = "newest" | "oldest" | "priority" | "progress";

export default function ClientGoals() {
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalWizardOpen, setGoalWizardOpen] = useState(false);
  const [goalWizardInitialCategory, setGoalWizardInitialCategory] =
    useState<GoalWizardCategory | null>(null);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
          const habitGoalStarts = goalsList
            .filter((g: Goal) => g.type === "habit" && g.start_date)
            .map((g: Goal) => g.start_date!);
          const habitLogsByDate: Set<string> = new Set();
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

          const goalsWithProgress = goalsList.map((goal: Goal) => {
            let progressPercentage = 0;

            if (goal.target_value != null && goal.current_value != null) {
              progressPercentage = Math.min(
                (goal.current_value / goal.target_value) * 100,
                100,
              );
            } else if (goal.type === "habit") {
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
    } catch (error: unknown) {
      console.error("Error loading goals:", error);
      setGoals([]);
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "Failed to load goals";
      setLoadError(
        message === "timeout"
          ? "Loading took too long. Please try again."
          : message || "Failed to load goals",
      );
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user]);

  const updateGoalProgress = async (
    goalId: string,
    newCurrentValue: number,
  ) => {
    try {
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

      addToast({ title: "Progress updated", variant: "success" });
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
    setDeletingGoal(true);
    try {
      const { error } = await supabase.from("goals").delete().eq("id", goalId);

      if (error) throw error;

      addToast({ title: "Goal deleted", variant: "success" });
      setPendingDeleteGoal(null);
      await loadGoals();
    } catch (error) {
      console.error("Error deleting goal:", error);
      addToast({
        title: "Failed to delete goal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingGoal(false);
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

    if (filterStatus !== "all") {
      filtered = filtered.filter((goal) => {
        const normalizedStatus =
          goal.status === "in_progress" ? "active" : goal.status;
        return normalizedStatus === filterStatus;
      });
    }

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
      case "priority": {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return filtered.sort(
          (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority],
        );
      }
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
    const completed = goals.filter((g) => g.status === "completed").length;
    return { total, completed };
  };

  const getGoalsForPillar = (pillar: Goal["pillar"]) => {
    const list = goals.filter((g) => sectionPillarForGoal(g) === pillar);
    return filteredAndSortedGoals(list);
  };

  const getPillarStats = (pillar: Goal["pillar"]) => {
    const list = goals.filter(
      (g) =>
        sectionPillarForGoal(g) === pillar &&
        (g.status === "active" || g.status === "in_progress"),
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

  const statusCounts = {
    all: goals.length,
    active: goals.filter(
      (g) => g.status === "active" || g.status === "in_progress",
    ).length,
    completed: goals.filter((g) => g.status === "completed").length,
    paused: goals.filter((g) => g.status === "paused").length,
    cancelled: goals.filter((g) => g.status === "cancelled").length,
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
          <PageSkeleton variant="dashboard" />
        </ClientPageShell>
      </ProtectedRoute>
    );
  }

  if (loadError) {
    return (
      <ProtectedRoute requiredRole="client">
        <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
          <div className={cn(ps.psV1, "space-y-4")}>
            <PsHero
              glow="action"
              onBack={() => router.push("/client/me")}
              backAriaLabel="Back to Me"
              eyebrow="Me · goals"
              eyebrowColor="var(--fc-accent)"
              title="Goals"
              subtitle="Set and track goals by pillar"
            />
            <div className="rounded-[13px] border border-[color:var(--fc-hairline)] px-4 py-8 text-center">
              <p className="mb-3 text-sm fc-text-dim">{loadError}</p>
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
          </div>
        </ClientPageShell>
      </ProtectedRoute>
    );
  }

  const stats = getGoalStats();
  const goalStatsFromService = getGoalStatsFromService(goals);
  const activeFilterCount =
    (filterStatus !== "all" ? 1 : 0) + (sortBy !== "newest" ? 1 : 0);

  const statusOptions: { value: FilterStatus; label: string; count: number }[] =
    statusCounts.paused > 0 || statusCounts.cancelled > 0
      ? [
          { value: "all", label: "All", count: statusCounts.all },
          { value: "active", label: "Active", count: statusCounts.active },
          { value: "completed", label: "Done", count: statusCounts.completed },
          { value: "paused", label: "Paused", count: statusCounts.paused },
        ]
      : [
          { value: "all", label: "All", count: statusCounts.all },
          { value: "active", label: "Active", count: statusCounts.active },
          { value: "completed", label: "Done", count: statusCounts.completed },
        ];

  const sortOptions: { value: SortBy; label: string }[] = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "priority", label: "Priority" },
    { value: "progress", label: "Progress" },
  ];

  const filterSummary =
    filterStatus === "all" && sortBy === "newest"
      ? "All · Newest"
      : `${
          statusOptions.find((o) => o.value === filterStatus)?.label ?? "All"
        } · ${sortOptions.find((o) => o.value === sortBy)?.label ?? "Newest"}`;

  return (
    <ProtectedRoute requiredRole="client">
      <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
        <div className={cn(ps.psV1, "space-y-4")}>
          <PsHero
            glow="action"
            onBack={() => router.push("/client/me")}
            backAriaLabel="Back to Me"
            eyebrow="Me · goals"
            eyebrowColor="var(--fc-accent)"
            title="Goals"
            subtitle="Set and track goals by pillar"
            rightSlot={
              <CheckinActionAddButton
                onClick={() => {
                  setGoalWizardInitialCategory(null);
                  setGoalWizardOpen(true);
                }}
              >
                Add
              </CheckinActionAddButton>
            }
          >
            {/* Colored overview — adherence ring + tinted tiles */}
            <div className="relative overflow-hidden rounded-[16px] border border-[color:var(--fc-accent-glow)] bg-[color:color-mix(in_srgb,var(--fc-accent)_8%,transparent)] p-3.5">
              <div
                className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, var(--fc-accent-dim) 0%, transparent 70%)",
                }}
                aria-hidden
              />
              <div className="relative z-[1] flex items-start gap-3.5">
                <div className="relative h-[72px] w-[72px] shrink-0">
                  <svg
                    width={72}
                    height={72}
                    viewBox="0 0 72 72"
                    className="block"
                    aria-hidden
                  >
                    <g transform="translate(36 36) rotate(-90)">
                      <circle
                        r={28}
                        fill="none"
                        stroke="var(--fc-hairline)"
                        strokeWidth={6}
                      />
                      <circle
                        r={28}
                        fill="none"
                        stroke="var(--fc-accent)"
                        strokeWidth={6}
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 28}
                        strokeDashoffset={
                          2 *
                          Math.PI *
                          28 *
                          (1 -
                            Math.min(
                              100,
                              goalStatsFromService.overallAdherence,
                            ) /
                              100)
                        }
                        style={{
                          filter: "drop-shadow(0 0 6px var(--fc-accent-glow))",
                        }}
                      />
                    </g>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className="text-lg font-bold tabular-nums leading-none fc-text-primary"
                      style={{ fontFamily: "var(--f-display)" }}
                    >
                      {goalStatsFromService.overallAdherence}
                    </span>
                    <span
                      className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fc-accent)]"
                      style={{ fontFamily: "var(--f-mono)" }}
                    >
                      adhere
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fc-accent)]"
                    style={{ fontFamily: "var(--f-mono)" }}
                  >
                    Overview
                  </p>
                  <p
                    className="mt-1 text-[15px] font-bold leading-tight fc-text-primary"
                    style={{ fontFamily: "var(--f-display)" }}
                  >
                    {goalStatsFromService.active} active · {stats.completed}{" "}
                    done
                  </p>
                  <p
                    className="mt-1 text-xs fc-text-dim"
                    style={{ fontFamily: "var(--f-mono)" }}
                  >
                    {stats.total} goal{stats.total === 1 ? "" : "s"} across
                    pillars
                  </p>
                </div>
              </div>
              <div className="relative z-[1] mt-3 grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      label: "Total",
                      value: stats.total,
                      color: "var(--fc-group-c)",
                      soft: "var(--fc-group-c-soft)",
                      dim: "var(--fc-group-c-dim)",
                    },
                    {
                      label: "Active",
                      value: goalStatsFromService.active,
                      color: "var(--fc-text-primary)",
                      soft: "var(--fc-surface-tint)",
                      dim: "var(--fc-hairline)",
                    },
                    {
                      label: "Done",
                      value: stats.completed,
                      color: "var(--fc-status-success)",
                      soft: "color-mix(in srgb, var(--fc-status-success) 12%, transparent)",
                      dim: "color-mix(in srgb, var(--fc-status-success) 28%, transparent)",
                    },
                  ] as const
                ).map((tile) => (
                  <div
                    key={tile.label}
                    className="flex flex-col items-center gap-0.5 rounded-[11px] border px-1.5 py-2 text-center"
                    style={{
                      borderColor: tile.dim,
                      background: tile.soft,
                    }}
                  >
                    <span
                      className="text-base font-bold tabular-nums leading-none"
                      style={{
                        fontFamily: "var(--f-display)",
                        color: tile.color,
                      }}
                    >
                      {tile.value}
                    </span>
                    <span
                      className="text-[9px] font-semibold uppercase tracking-[0.12em]"
                      style={{
                        fontFamily: "var(--f-mono)",
                        color: tile.color,
                        opacity: 0.85,
                      }}
                    >
                      {tile.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </PsHero>

          {/* Collapsed filters */}
          <section className="rounded-[13px] border border-[color:var(--fc-hairline)] bg-transparent">
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
              aria-expanded={filtersOpen}
            >
              <div className="flex min-w-0 items-center gap-2">
                <ListFilter className="h-3.5 w-3.5 shrink-0 fc-text-subtle" />
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.16em] fc-text-subtle"
                  style={{ fontFamily: "var(--f-mono)" }}
                >
                  Filters
                </span>
                <span
                  className="truncate text-xs fc-text-dim"
                  style={{ fontFamily: "var(--f-mono)" }}
                >
                  {filterSummary}
                </span>
                {activeFilterCount > 0 ? (
                  <span className="shrink-0 rounded-md border border-[color:var(--fc-hairline)] bg-[color:var(--fc-surface-tint)] px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums fc-text-primary">
                    {activeFilterCount}
                  </span>
                ) : null}
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 fc-text-dim transition-transform duration-200",
                  filtersOpen && "rotate-180",
                )}
              />
            </button>

            {filtersOpen ? (
              <div className="space-y-3 border-t border-[color:var(--fc-hairline)] px-3.5 pb-3.5 pt-3">
                <div>
                  <p
                    className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] fc-text-subtle"
                    style={{ fontFamily: "var(--f-mono)" }}
                  >
                    Status
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {statusOptions.map((option) => {
                      const isActive = filterStatus === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFilterStatus(option.value)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors",
                            isActive
                              ? "border-[color:var(--fc-hairline-strong,var(--fc-glass-border))] bg-[color:var(--fc-surface-tint)] fc-text-primary"
                              : "border-[color:var(--fc-hairline)] bg-transparent fc-text-subtle hover:fc-text-primary",
                          )}
                        >
                          {option.label}
                          <span
                            className={cn(
                              "tabular-nums",
                              isActive ? "fc-text-dim" : "fc-text-subtle",
                            )}
                          >
                            {option.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p
                    className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] fc-text-subtle"
                    style={{ fontFamily: "var(--f-mono)" }}
                  >
                    Sort
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sortOptions.map((option) => {
                      const isActive = sortBy === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSortBy(option.value)}
                          className={cn(
                            "rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors",
                            isActive
                              ? "border-[color:var(--fc-hairline-strong,var(--fc-glass-border))] bg-[color:var(--fc-surface-tint)] fc-text-primary"
                              : "border-[color:var(--fc-hairline)] bg-transparent fc-text-subtle hover:fc-text-primary",
                          )}
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
            const pillarGoalsList = getGoalsForPillar(pillarId);
            const pillarStat = getPillarStats(pillarId);
            const count = pillarStat?.count ?? 0;
            const adherence = pillarStat?.adherence ?? 0;
            return (
              <section
                key={pillarId}
                className="rounded-[16px] border border-[color:var(--fc-hairline)] bg-transparent p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <PsSectionEyebrow accent="action" className="mb-1">
                      {label} pillar
                    </PsSectionEyebrow>
                    <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold tracking-tight fc-text-primary">
                      <PillarIcon
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: PILLAR_SECTION_ICON_COLOR[pillarId] }}
                      />
                      <span
                        className="truncate"
                        style={{ fontFamily: "var(--f-display)" }}
                      >
                        {label}
                      </span>
                    </h2>
                  </div>
                  {count > 0 ? (
                    <span
                      className="shrink-0 text-xs tabular-nums fc-text-dim"
                      style={{ fontFamily: "var(--f-mono)" }}
                    >
                      {count} · {adherence}%
                    </span>
                  ) : null}
                </div>

                {pillarGoalsList.length === 0 ? (
                  <div className="rounded-[13px] border border-dashed border-[color:var(--fc-hairline)] px-4 py-8 text-center">
                    <p className="mb-2 text-sm fc-text-dim">
                      No goals in this pillar yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => openGoalWizard(pillarId)}
                      className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fc-accent)] hover:opacity-80"
                    >
                      <Plus className="h-3 w-3" strokeWidth={2.5} />
                      Add {label} goal
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 grid grid-cols-1 gap-3">
                      {pillarGoalsList.map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal as Goal}
                          isAutoTracked={goalHasAutoSync(goal)}
                          onDelete={() => setPendingDeleteGoal(goal as Goal)}
                          onUpdate={updateGoalProgress}
                          onEdit={(g) => setEditGoal(g as Goal)}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => openGoalWizard(pillarId)}
                      className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fc-accent)] hover:opacity-80"
                    >
                      <Plus className="h-3 w-3" strokeWidth={2.5} />
                      Add {label} goal
                    </button>
                  </>
                )}
              </section>
            );
          })}

          <button
            type="button"
            onClick={() => router.push("/client/goals/history")}
            className="flex w-full items-center justify-between rounded-[13px] border border-[color:var(--fc-hairline)] bg-transparent px-4 py-3 text-left transition-colors hover:bg-[color:var(--fc-surface-tint)]"
          >
            <span
              className="text-sm font-semibold fc-text-primary"
              style={{ fontFamily: "var(--f-display)" }}
            >
              Goal history
            </span>
            <span
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fc-accent)]"
            >
              View all →
            </span>
          </button>

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

          <ConfirmActionDialog
            open={pendingDeleteGoal != null}
            onOpenChange={(open) => {
              if (!open) setPendingDeleteGoal(null);
            }}
            title={`Delete “${pendingDeleteGoal?.title ?? "goal"}”?`}
            description="This removes the goal and its progress. You can create a new one anytime."
            confirmLabel="Delete goal"
            confirming={deletingGoal}
            variant="destructive"
            onConfirm={() => {
              if (!pendingDeleteGoal) return;
              void handleDeleteGoal(pendingDeleteGoal.id);
            }}
          />
        </div>
      </ClientPageShell>
    </ProtectedRoute>
  );
}
