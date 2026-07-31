"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import {
  ClientPageShell,
} from "@/components/client-ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import {
  PsHero,
  PsSegmented,
  PsSectionEyebrow,
  progressSuiteV1Styles as ps,
} from "@/components/client/progress-suite";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type PillarFilter = "all" | "training" | "nutrition" | "checkins" | "lifestyle";
type GoalPillar = "training" | "nutrition" | "lifestyle" | "checkins" | "general";

type GoalRow = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  pillar: GoalPillar;
  status: string;
  target_value?: number | null;
  target_unit?: string | null;
  current_value?: number | null;
  created_at: string;
};

/** Align with Goals page `sectionPillarForGoal` — prefer real pillar, fall back via category. */
function resolvePillar(goal: {
  pillar?: string | null;
  category?: string | null;
}): GoalPillar {
  const cat = (goal.category || "").toLowerCase();
  if (cat === "behavioral") return "lifestyle";
  switch (cat) {
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
      break;
  }
  const p = (goal.pillar || "").toLowerCase();
  if (
    p === "training" ||
    p === "nutrition" ||
    p === "lifestyle" ||
    p === "checkins" ||
    p === "general"
  ) {
    return p;
  }
  return "general";
}

function pillarLabel(pillar: string): string {
  if (pillar === "checkins") return "Body";
  if (pillar === "general") return "Other";
  return pillar.charAt(0).toUpperCase() + pillar.slice(1);
}

function goalStatusBadgeVariant(
  status: string,
): "status-info" | "status-success" | "outline" {
  const s = (status || "").toLowerCase();
  if (s === "active" || s === "in_progress") return "status-info";
  if (s === "completed" || s === "complete") return "status-success";
  return "outline";
}

function formatStatusLabel(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "active" || s === "in_progress") return "Active";
  if (s === "completed" || s === "complete") return "Completed";
  if (s === "paused") return "Paused";
  if (s === "cancelled") return "Cancelled";
  if (s === "abandoned") return "Abandoned";
  return s ? s.replace(/_/g, " ") : "—";
}

export default function GoalHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pillarFilter, setPillarFilter] = useState<PillarFilter>("all");
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data, error } = await supabase
          .from("goals")
          .select(
            "id, title, description, category, pillar, status, target_value, target_unit, current_value, created_at",
          )
          .eq("client_id", user.id)
          .order("created_at", { ascending: false });

        if (cancelled) return;
        if (error) {
          console.error("Error loading goals:", error);
          setLoadError("Could not load goal history.");
          setGoals([]);
        } else {
          setGoals(
            (data || []).map((g) => ({
              ...g,
              category: g.category || "other",
              pillar: resolvePillar(g),
            })),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const filtered = goals.filter((g) => {
    if (pillarFilter !== "all" && g.pillar !== pillarFilter) return false;
    if (
      activeOnly &&
      g.status !== "active" &&
      g.status !== "in_progress"
    ) {
      return false;
    }
    return true;
  });

  const byPillar = filtered.reduce<Record<string, GoalRow[]>>((acc, g) => {
    const key = g.pillar === "general" ? "other" : g.pillar;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

  const orderedPillars = [
    "training",
    "nutrition",
    "checkins",
    "lifestyle",
    "other",
  ].filter((c) => (byPillar[c]?.length ?? 0) > 0);

  const pillarCounts = {
    all: goals.length,
    training: goals.filter((g) => g.pillar === "training").length,
    nutrition: goals.filter((g) => g.pillar === "nutrition").length,
    checkins: goals.filter((g) => g.pillar === "checkins").length,
    lifestyle: goals.filter((g) => g.pillar === "lifestyle").length,
  };

  return (
    <ProtectedRoute requiredRole="client">
      <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
        <div className={cn(ps.psV1, "space-y-4")}>
          <PsHero
            glow="action"
            onBack={() => router.push("/client/goals")}
            backAriaLabel="Back to Goals"
            eyebrow="Me · goals · history"
            eyebrowColor="var(--fc-accent)"
            title="Goal history"
            subtitle="All goals across Training, Nutrition, Body, Lifestyle"
          />

          <PsSegmented<PillarFilter>
            value={pillarFilter}
            onChange={setPillarFilter}
            ariaLabel="Filter goals by pillar"
            options={[
              { value: "all", label: "All", count: pillarCounts.all },
              { value: "training", label: "Train", count: pillarCounts.training },
              { value: "nutrition", label: "Fuel", count: pillarCounts.nutrition },
              { value: "checkins", label: "Body", count: pillarCounts.checkins },
              { value: "lifestyle", label: "Life", count: pillarCounts.lifestyle },
            ]}
          />

          <label
            htmlFor="goals-history-active-only"
            className="flex items-center gap-2 text-sm fc-text-dim cursor-pointer"
          >
            <Checkbox
              id="goals-history-active-only"
              checked={activeOnly}
              onCheckedChange={(checked) => setActiveOnly(checked === true)}
            />
            Active only
          </label>

          {loading ? (
            <PageSkeleton variant="list" />
          ) : loadError ? (
            <div className="rounded-[13px] border border-[color:var(--fc-hairline)] px-4 py-8 text-center">
              <p className="mb-4 text-sm fc-text-dim">{loadError}</p>
              <Button
                type="button"
                variant="fc-secondary"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[13px] border border-dashed border-[color:var(--fc-hairline)] px-4 py-8 text-center">
              <p className="mb-2 text-sm fc-text-dim">No goals found</p>
              <p className="mb-6 text-sm fc-text-subtle">
                Create goals from the Goals page to see them here.
              </p>
              <Button
                type="button"
                variant="fc-secondary"
                onClick={() => router.push("/client/goals")}
              >
                Open Goals
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {orderedPillars.map((pillarKey) => (
                <section key={pillarKey} className="space-y-2">
                  <PsSectionEyebrow accent="action">
                    {pillarLabel(pillarKey)}
                  </PsSectionEyebrow>
                  <div className="space-y-2">
                    {byPillar[pillarKey].map((goal) => {
                      const progress =
                        goal.target_value != null &&
                        goal.target_value > 0 &&
                        goal.current_value != null
                          ? Math.min(
                              100,
                              Math.round(
                                (goal.current_value / goal.target_value) * 100,
                              ),
                            )
                          : null;
                      return (
                        <div
                          key={goal.id}
                          className="rounded-[13px] border border-[color:var(--fc-hairline)] bg-transparent p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate text-sm font-bold fc-text-primary"
                                style={{ fontFamily: "var(--f-display)" }}
                              >
                                {goal.title}
                              </p>
                              {goal.description ? (
                                <p className="mt-0.5 line-clamp-2 text-xs fc-text-dim">
                                  {goal.description}
                                </p>
                              ) : null}
                              <p
                                className="mt-1 text-[11px] fc-text-subtle"
                                style={{ fontFamily: "var(--f-mono)" }}
                              >
                                {new Date(goal.created_at).toLocaleDateString(
                                  undefined,
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                                {goal.target_value != null
                                  ? ` · Target ${goal.current_value ?? 0}/${goal.target_value}${goal.target_unit ? ` ${goal.target_unit}` : ""}`
                                  : ""}
                              </p>
                              {progress != null ? (
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--fc-surface-tint)]">
                                  <div
                                    className="h-full rounded-full bg-[color:var(--fc-accent)]"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              ) : null}
                            </div>
                            <Badge variant={goalStatusBadgeVariant(goal.status)}>
                              {formatStatusLabel(goal.status)}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </ClientPageShell>
    </ProtectedRoute>
  );
}
