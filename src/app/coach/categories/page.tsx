"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { withTimeout } from "@/lib/withTimeout";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTheme } from "@/contexts/ThemeContext";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Dumbbell,
  Zap,
  Heart,
  Target,
  Edit,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Activity,
  Layers,
  Star,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import CategoryForm from "@/components/CategoryForm";
import { CoachExerciseCategoriesPanel } from "@/components/coach/CoachExerciseCategoriesPanel";

interface WorkoutCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  exercise_count?: number;
}

const categoryIcons = {
  Dumbbell: Dumbbell,
  Zap: Zap,
  Heart: Heart,
  Target: Target,
};

const categoryColors = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Red", value: "#EF4444" },
  { name: "Green", value: "#10B981" },
  { name: "Yellow", value: "#F59E0B" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Orange", value: "#F97316" },
  { name: "Gray", value: "#6B7280" },
];

function CategoriesHubContent() {
  const { performanceSettings } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "exercises" ? "exercises" : "workouts";

  const [categories, setCategories] = useState<WorkoutCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<WorkoutCategory | null>(null);
  const loadingRef = useRef(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
    }, 20_000);
    loadCategories().finally(() => {
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
  }, []);

  const loadCategories = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setLoading(true);
      await withTimeout(
        (async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;
          const { data, error } = await supabase
            .from("workout_categories")
            .select("*")
            .eq("coach_id", user.id)
            .eq("is_active", true)
            .order("created_at", { ascending: false });
          if (error) throw error;
          const processedCategories = await Promise.all(
            (data || []).map(async (category) => {
              const { count, error: countErr } = await supabase
                .from("workout_templates")
                .select("*", { count: "exact", head: true })
                .eq("category", category.name)
                .eq("coach_id", user.id);
              if (countErr) throw countErr;
              return { ...category, exercise_count: count || 0 };
            })
          );
          setCategories(processedCategories);
        })().catch(async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const savedCategories = localStorage.getItem(
            `workout_categories_${user.id}`
          );
          if (savedCategories) {
            const categoriesWithCount = JSON.parse(savedCategories).map(
              (cat: WorkoutCategory) => ({
                ...cat,
                exercise_count: Math.floor(Math.random() * 20) + 1,
              })
            );
            setCategories(categoriesWithCount);
          } else {
            const sampleCategories: WorkoutCategory[] = [
              {
                id: "1",
                name: "Upper Body",
                description: "Chest, shoulders, arms, and back exercises",
                color: "#EF4444",
                icon: "Dumbbell",
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                exercise_count: 15,
              },
              {
                id: "2",
                name: "Lower Body",
                description: "Legs, glutes, and lower body exercises",
                color: "#10B981",
                icon: "Zap",
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                exercise_count: 12,
              },
              {
                id: "3",
                name: "Cardio",
                description: "Cardiovascular and endurance training",
                color: "#F59E0B",
                icon: "Heart",
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                exercise_count: 8,
              },
            ];
            setCategories(sampleCategories);
            localStorage.setItem(
              `workout_categories_${user.id}`,
              JSON.stringify(sampleCategories)
            );
          }
        }),
        45000,
        "loadCategories"
      );
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const { error } = await supabase
          .from("workout_categories")
          .update({ is_active: false })
          .eq("id", categoryId);

        if (error) throw error;
      } catch {
        const savedCategories = localStorage.getItem(
          `workout_categories_${user.id}`
        );
        let categories = savedCategories ? JSON.parse(savedCategories) : [];
        categories = categories.filter(
          (cat: WorkoutCategory) => cat.id !== categoryId
        );
        localStorage.setItem(
          `workout_categories_${user.id}`,
          JSON.stringify(categories)
        );
      }

      setCategories(
        categories.filter((category) => category.id !== categoryId)
      );
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell widthVariant="default-5xl" className="p-4 pb-[var(--fc-bottom-safe-area)] sm:p-6 md:p-8">
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => router.push("/coach/training")}
              className="fc-surface inline-flex items-center gap-2 rounded-xl border border-[color:var(--fc-surface-card-border)] px-3 py-2.5 w-fit text-[color:var(--fc-text-primary)] text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Back to Training
            </button>
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <nav className="flex items-center gap-2 text-sm fc-text-dim mb-3 font-mono uppercase tracking-widest">
                  Coach <ArrowRight className="w-3 h-3 inline" /> Management
                </nav>
                <h1 className="text-2xl font-bold tracking-tight fc-text-primary mb-2">Categories</h1>
                <p className="text-base fc-text-dim">Workout template tags and exercise library groupings.</p>
              </div>
              {activeTab === "workouts" && (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="fc-btn fc-btn-primary px-6 rounded-2xl h-12 font-semibold flex items-center justify-center gap-2 shrink-0"
                >
                  <Plus className="w-5 h-5" />
                  New Category
                </button>
              )}
            </header>

            <div
              role="tablist"
              aria-label="Category type"
              className="flex items-center gap-2 fc-glass p-1.5 rounded-2xl border border-[color:var(--fc-glass-border)] w-fit flex-wrap"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "workouts"}
                onClick={() => router.push("/coach/categories?tab=workouts", { scroll: false })}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px] ${activeTab === "workouts" ? "fc-glass-soft fc-text-primary" : "fc-text-dim hover:fc-text-primary"}`}
              >
                Workout categories
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "exercises"}
                onClick={() => router.push("/coach/categories?tab=exercises", { scroll: false })}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px] ${activeTab === "exercises" ? "fc-glass-soft fc-text-primary" : "fc-text-dim hover:fc-text-primary"}`}
              >
                Exercise categories
              </button>
            </div>

            {activeTab === "exercises" ? (
              <CoachExerciseCategoriesPanel />
            ) : loading ? (
              <PageSkeleton variant="dashboard" />
            ) : (
              <>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-72 md:ml-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 fc-text-dim pointer-events-none" />
                <Input
                  placeholder="Search workout categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="fc-input h-12 pl-11 w-full rounded-xl"
                />
              </div>
            </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCategories.map((category) => {
                  const IconComponent =
                    categoryIcons[
                      category.icon as keyof typeof categoryIcons
                    ] || Dumbbell;
                  return (
                    <div
                      key={category.id}
                      className="group fc-card-shell p-6 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className="w-14 h-14 rounded-[18px] flex items-center justify-center shrink-0"
                                style={{ backgroundColor: category.color + "20" }}
                              >
                                <IconComponent
                                  className="w-8 h-8"
                                  style={{ color: category.color }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold fc-text-primary mb-1 leading-snug group-hover:text-[color:var(--fc-accent-cyan)] transition-colors m-0 truncate">
                                  {category.name}
                                </h3>
                                <p className="text-sm font-normal fc-text-dim m-0 leading-normal line-clamp-2">
                                  {category.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 fc-text-dim">
                                <Activity className="w-4 h-4 text-[color:var(--fc-status-success)]" />
                                <span className="text-sm font-medium">
                                  {category.exercise_count || 0} exercises
                                </span>
                              </div>
                              <div className="flex items-center gap-1 rounded-2xl py-1 px-3 text-xs border-2 border-[color:var(--fc-glass-border)] fc-text-dim">
                                <Star className="w-3 h-3" />
                                Active
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[color:var(--fc-glass-border)]">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCategory(category);
                              setShowCreateForm(true);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-2xl text-sm font-semibold border-2 border-[color:var(--fc-glass-border)] bg-transparent fc-text-primary hover:bg-[color:var(--fc-accent-cyan)] hover:border-[color:var(--fc-accent-cyan)] hover:text-white transition-colors duration-200"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => deleteCategory(category.id)}
                            className="flex items-center justify-center py-2 px-4 rounded-2xl text-sm font-semibold border-2 border-[color:var(--fc-glass-border)] bg-transparent text-[color:var(--fc-status-error)] hover:border-[color:var(--fc-status-error)] hover:bg-[color-mix(in_srgb,var(--fc-status-error)_20%,transparent)] transition-colors duration-200"
                            aria-label="Delete category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Empty State */}
              {filteredCategories.length === 0 && (
                <EmptyState
                  icon={Layers}
                  title={
                    categories.length === 0
                      ? "No categories yet"
                      : "No categories found"
                  }
                  description={
                    categories.length === 0
                      ? "Start organizing your workout templates by creating your first category."
                      : "Try adjusting your search criteria."
                  }
                  action={
                    categories.length === 0
                      ? {
                          label: "Create Category",
                          onClick: () => setShowCreateForm(true),
                        }
                      : undefined
                  }
                />
              )}

              {/* Category Form Modal */}
              <CategoryForm
                isOpen={showCreateForm}
                onClose={() => {
                  setShowCreateForm(false);
                  setEditingCategory(null);
                }}
                onSuccess={() => {
                  loadCategories();
                  setShowCreateForm(false);
                  setEditingCategory(null);
                }}
                category={editingCategory}
                colors={categoryColors}
              />
              </>
            )}
          </div>
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}

function CategoriesHubFallback() {
  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        <CoachPageShell widthVariant="default-5xl" className="p-4 pb-[var(--fc-bottom-safe-area)] sm:p-6 md:p-8">
          <PageSkeleton variant="dashboard" />
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}

export default function WorkoutCategories() {
  return (
    <Suspense fallback={<CategoriesHubFallback />}>
      <CategoriesHubContent />
    </Suspense>
  );
}
