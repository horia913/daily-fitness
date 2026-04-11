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
  Pill,
} from "@/components/client-ui";
import { Target, ArrowLeft, Filter } from "lucide-react";
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
        <ClientPageShell className="max-w-3xl flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => { window.location.href = "/client/goals"; }}
              className="p-2 rounded-xl fc-glass hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5 fc-text-primary" />
            </button>
            <div>
              <h1 className="text-xl font-bold fc-text-primary">Goal History</h1>
              <p className="text-sm fc-text-dim">All goals across Training, Nutrition, Lifestyle</p>
            </div>
          </div>

          <ClientGlassCard className="p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Filter className="w-4 h-4 fc-text-dim" />
              <span className="text-sm fc-text-dim">Filter:</span>
              {(["all", "training", "nutrition", "lifestyle"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    categoryFilter === c ? "fc-glass border border-[color:var(--fc-glass-border)] fc-text-primary" : "fc-text-dim hover:fc-text-primary"
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
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl animate-pulse bg-[color:var(--fc-surface-sunken)]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <ClientGlassCard className="p-12 text-center">
              <Target className="w-12 h-12 fc-text-dim mx-auto mb-4 opacity-50" />
              <p className="fc-text-primary font-medium mb-2">No goals found</p>
              <p className="text-sm fc-text-dim mb-6">Create goals from the Goals page to see them here.</p>
              <SecondaryButton onClick={() => { window.location.href = "/client/goals"; }}>
                Open Goals
              </SecondaryButton>
            </ClientGlassCard>
          ) : (
            <div className="flex flex-col gap-6">
              {orderedCategories.map((cat) => (
                <section key={cat}>
                  <SectionHeader title={cat.charAt(0).toUpperCase() + cat.slice(1)} />
                  <div className="space-y-3">
                    {byCategory[cat].map((g) => (
                      <ClientGlassCard key={g.id} className="p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold fc-text-primary">{g.title}</h3>
                            {g.description && (
                              <p className="text-sm fc-text-dim mt-0.5 line-clamp-2">{g.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Pill>{g.status === "active" ? "Active" : "Inactive"}</Pill>
                              <span className="text-xs fc-text-dim">
                                {new Date(g.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            {g.target_value != null && (
                              <div className="font-mono fc-text-dim">
                                Target: {String(g.target_value)}{g.target_unit ?? ""}
                              </div>
                            )}
                            {g.current_value != null && (
                              <div className="font-mono fc-text-dim">Current: {String(g.current_value)}</div>
                            )}
                          </div>
                        </div>
                      </ClientGlassCard>
                    ))}
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
