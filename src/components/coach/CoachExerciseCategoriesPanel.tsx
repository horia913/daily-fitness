"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/ui/toast-provider";
import {
  Plus,
  Dumbbell,
  Zap,
  Heart,
  Target,
  Edit,
  Trash2,
  ArrowRight,
  Layers,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import ExerciseCategoryForm from "@/components/ExerciseCategoryForm";

interface ExerciseCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  created_at: string;
  exercise_count?: number;
}

const categoryIcons = {
  Dumbbell: Dumbbell,
  Zap: Zap,
  Heart: Heart,
  Target: Target,
};

export function CoachExerciseCategoriesPanel() {
  const { isDark, performanceSettings } = useTheme();
  const { addToast } = useToast();

  const [categories, setCategories] = useState<ExerciseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExerciseCategory | null>(null);

  const loadingRef = useRef(false);
  const didLoadRef = useRef(false);

  const loadCategories = useCallback(async (signal?: AbortSignal) => {
    if (signal) {
      if (didLoadRef.current) return;
      if (loadingRef.current) return;
      didLoadRef.current = true;
    }
    loadingRef.current = true;
    try {
      setLoading(true);
      const res = await fetch("/api/coach/exercise-categories", { signal: signal ?? null });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const { categories: list } = await res.json();
      setCategories(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        if (signal) didLoadRef.current = false;
        return;
      }
      console.error("Error loading categories:", err);
      if (signal) didLoadRef.current = false;
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    loadCategories(ac.signal);
    return () => {
      didLoadRef.current = false;
      loadingRef.current = false;
      ac.abort();
    };
  }, [loadCategories]);

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const deleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? Exercises using this category will not be deleted."))
      return;

    try {
      const { error } = await supabase.from("exercise_categories").delete().eq("id", categoryId);

      if (error) throw error;

      setCategories(categories.filter((category) => category.id !== categoryId));
    } catch (error) {
      console.error("Error deleting category:", error);
      addToast({
        title: "Error deleting category. Make sure no exercises are using it.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="rounded-2xl p-8 fc-surface animate-pulse">
          <div className="h-8 rounded-xl mb-4 bg-[color:var(--fc-glass-highlight)]" />
          <div className="h-4 rounded-lg w-3/4 mb-2 bg-[color:var(--fc-glass-highlight)]" />
          <div className="h-4 rounded-lg w-1/2 bg-[color:var(--fc-glass-highlight)]" />
        </div>
      </>
    );
  }

  return (
    <>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="space-y-3">
        <header className="flex min-h-12 items-center justify-between gap-3">
          <h2 className="text-lg font-semibold fc-text-primary sm:text-xl">
            Categories
          </h2>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="fc-btn fc-btn-primary hidden h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold md:inline-flex"
          >
            <Plus className="w-4 h-4" />
            New category
          </button>
        </header>

        <div className="relative w-full max-w-md">
          <input
            type="search"
            placeholder="Search exercise categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="fc-input h-12 pl-4 pr-4 w-full rounded-xl bg-[color:var(--fc-surface)] border border-[color:var(--fc-glass-border)] fc-text-primary"
          />
        </div>

        <div className="fc-surface divide-y divide-[color:var(--fc-glass-border)]/50 overflow-hidden rounded-xl border border-[color:var(--fc-glass-border)]">
          {filteredCategories.map((category) => {
            const IconComponent =
              categoryIcons[category.icon as keyof typeof categoryIcons] ||
              Dumbbell;
            return (
              <div
                key={category.id}
                className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.02]"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${category.color}25` }}
                >
                  <IconComponent
                    className="h-4 w-4"
                    style={{ color: category.color }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium fc-text-primary">
                    {category.name}
                  </p>
                  {category.description ? (
                    <p className="truncate text-xs fc-text-dim">
                      {category.description}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs tabular-nums text-gray-400">
                  {category.exercise_count || 0} ex
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(category);
                      setShowCreateForm(true);
                    }}
                    className="rounded-lg p-2 fc-text-primary transition-colors hover:bg-[color:var(--fc-glass-soft)]"
                    aria-label={`Edit ${category.name}`}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(category.id)}
                    className="rounded-lg p-2 text-[color:var(--fc-status-error)] transition-colors hover:bg-[color:var(--fc-status-error)]/10"
                    aria-label={`Delete ${category.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCategories.length === 0 && (
          <div className="fc-surface rounded-2xl p-12 text-center">
            <div
              className="w-24 h-24 mx-auto mb-6 flex items-center justify-center rounded-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
              style={{ background: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)" }}
            >
              <Layers className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-3xl font-bold fc-text-primary m-0 mb-4 leading-tight">
              {categories.length === 0 ? "No exercise categories yet" : "No categories found"}
            </h3>
            <p className="text-base font-normal fc-text-dim mx-auto mb-8 max-w-[448px] leading-normal m-0">
              {categories.length === 0
                ? "Start organizing your exercise library by creating your first category."
                : "Try adjusting your search criteria."}
            </p>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-3 py-4 px-8 rounded-[20px] border-none text-base font-semibold text-white bg-[color:var(--fc-accent-primary)] cursor-pointer transition-all duration-200 shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <Plus className="w-5 h-5" />
              Create Category
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        <ExerciseCategoryForm
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
        />
      </div>

      <button
        type="button"
        onClick={() => setShowCreateForm(true)}
        className="fc-btn fc-btn-primary fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg md:hidden z-50"
        aria-label="Create category"
      >
        <Plus className="w-7 h-7" />
      </button>
    </>
  );
}
