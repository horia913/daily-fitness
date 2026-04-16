"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import {
  ClientPageShell,
  ClientGlassCard,
  SectionHeader,
  SecondaryButton,
} from "@/components/client-ui";
import { ArrowLeft, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";

type CategoryFilter = "all" | "training" | "nutrition" | "lifestyle";
type GoalRow = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  status: string;
  target_value?: number | null;
  target_unit?: string | null;
  current_value?: number | null;
  created_at: string;
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  training: ["workout", "training", "strength", "weight", "lift", "exercise"],
  nutrition: ["nutrition", "calorie", "protein", "macro", "diet", "food", "water"],
  lifestyle: ["habit", "sleep", "lifestyle", "activity"],
};

function inferCategory(title: string, category: string): CategoryFilter {
  const c = (category || "").toLowerCase();
  if (c === "training" || c === "workout" || c === "strength" || c === "endurance" || c === "performance") return "training";
  if (c === "nutrition" || c === "diet" || c === "food") return "nutrition";
  if (c === "lifestyle" || c === "habit") return "lifestyle";

  const t = (title || "").toLowerCase();
  for (const [key, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => t.includes(k))) return key as CategoryFilter;
  }
  return "all";
}

function categoryLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function statusPillClasses(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "active") {
    return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
  }
  if (s === "completed" || s === "complete") {
    return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  }
  if (s === "abandoned") {
    return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
  return "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

function formatStatusLabel(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "active") return "Active";
  if (s === "completed" || s === "complete") return "Completed";
  if (s === "abandoned") return "Abandoned";
  return s ? s.replace(/_/g, " ") : "—";
}

export default function GoalHistoryPage() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("goals")
          .select("id, title, description, category, status, target_value, target_unit, current_value, created_at")
          .eq("client_id", user.id)
          .order("created_at", { ascending: false });

        if (cancelled) return;
        if (error) {
          console.error("Error loading goals:", error);
          setGoals([]);
        } else {
          setGoals((data || []).map((g) => ({ ...g, category: g.category || "other" })));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const filtered = goals.filter((g) => {
    const inferred = inferCategory(g.title, g.category);
    if (categoryFilter !== "all" && inferred !== categoryFilter) return false;
    if (activeOnly && g.status !== "active") return false;
    return true;
  });

  const byCategory = filtered.reduce<Record<string, GoalRow[]>>((acc, g) => {
    const c = inferCategory(g.title, g.category);
    const key = c === "all" ? "other" : c;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

  const orderedCategories = ["training", "nutrition", "lifestyle", "other"].filter((c) => (byCategory[c]?.length ?? 0) > 0);

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
          <div className="flex items-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => { window.location.href = "/client/goals"; }}
              className="p-2 rounded-xl fc-glass hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5 fc-text-primary" />
            </button>
            <div>
              <h1 className="text-xl font-bold fc-text-primary mb-4">Goal History</h1>
              <p className="text-sm fc-text-dim">All goals across Training, Nutrition, Lifestyle</p>
            </div>
          </div>

          <ClientGlassCard className="p-4 mb-4">
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <Filter className="w-4 h-4 fc-text-dim shrink-0" />
              <span className="text-sm fc-text-dim shrink-0">Filter:</span>
              {(["all", "training", "nutrition", "lifestyle"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border transition-colors ${
                    categoryFilter === c
                      ? "fc-glass border-[color:var(--fc-glass-border-strong)] fc-text-primary"
                      : "border-[color:var(--fc-glass-border)] fc-text-subtle hover:fc-text-primary"
                  }`}
                >
                  {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm fc-text-dim cursor-pointer">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
              />
              Active only
            </label>
          </ClientGlassCard>

          {loading ? (
            <div className="space-y-3 mb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl animate-pulse bg-[color:var(--fc-surface-sunken)]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <p className="text-sm text-gray-400 mb-2">No goals found</p>
              <p className="text-sm text-gray-400 mb-6">Create goals from the Goals page to see them here.</p>
              <SecondaryButton
                type="button"
                onClick={() => { window.location.href = "/client/goals"; }}
              >
                Open Goals
              </SecondaryButton>
            </div>
          ) : (
            <div className="flex flex-col">
              {orderedCategories.map((cat) => (
                <section key={cat} className="mb-6 last:mb-0">
                  <SectionHeader title={categoryLabel(cat)} />
                  <div className="mt-2 space-y-3">
                    {byCategory[cat].map((g) => {
                      const dateStr = new Date(g.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                      const targetNum = (() => {
                        const v = g.target_value;
                        if (v == null) return null;
                        const n = typeof v === "number" ? v : Number(v);
                        return Number.isFinite(n) ? n : null;
                      })();
                      const currentNum = (() => {
                        const v = g.current_value;
                        if (v == null) return null;
                        const n = typeof v === "number" ? v : Number(v);
                        return Number.isFinite(n) ? n : null;
                      })();
                      const showProgressBar =
                        targetNum != null && targetNum > 0 && currentNum != null;
                      const progressPct = showProgressBar
                        ? Math.min(100, Math.max(0, (currentNum / targetNum) * 100))
                        : 0;
                      const targetDisplay =
                        g.target_value != null
                          ? `${String(g.target_value)}${g.target_unit ?? ""}`
                          : null;
                      const currentDisplay =
                        g.current_value != null ? String(g.current_value) : null;

                      return (
                        <div
                          key={g.id}
                          className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left"
                        >
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <h3 className="min-w-0 flex-1 text-[17px] font-semibold tracking-tight text-white">
                              {g.title}
                            </h3>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${statusPillClasses(g.status)}`}
                            >
                              {formatStatusLabel(g.status)}
                            </span>
                          </div>
                          {g.description ? (
                            <p className="mb-2 mt-1 text-sm leading-relaxed text-gray-400 line-clamp-2">
                              {g.description}
                            </p>
                          ) : null}
                          <div
                            className={`flex flex-wrap items-baseline gap-x-1 text-xs text-gray-500 mb-0 ${g.description ? "" : "mt-2"}`}
                          >
                            <span className="text-[10px] font-medium uppercase tracking-wider text-cyan-300/70">
                              {categoryLabel(cat)}
                            </span>
                            <span className="text-gray-600" aria-hidden>
                              ·
                            </span>
                            <span className="tabular-nums">{dateStr}</span>
                            {!showProgressBar && targetDisplay != null ? (
                              <>
                                <span className="text-gray-600" aria-hidden>
                                  ·
                                </span>
                                <span>
                                  Target{" "}
                                  <span className="tabular-nums">{targetDisplay}</span>
                                </span>
                              </>
                            ) : null}
                            {!showProgressBar && currentDisplay != null ? (
                              <>
                                <span className="text-gray-600" aria-hidden>
                                  ·
                                </span>
                                <span>
                                  Current{" "}
                                  <span className="tabular-nums">{currentDisplay}</span>
                                </span>
                              </>
                            ) : null}
                          </div>
                          {showProgressBar && currentNum != null && targetNum != null ? (
                            <div className="mt-3">
                              <div className="mb-1 flex items-baseline justify-between gap-2">
                                <span className="text-sm font-semibold tabular-nums text-white">
                                  {String(currentNum)}
                                </span>
                                <span className="text-xs tabular-nums text-gray-500">
                                  / {String(targetNum)}
                                  {g.target_unit ?? ""}
                                </span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
