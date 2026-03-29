"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import WorkoutTemplateService from "@/lib/workoutTemplateService";
import { supabase } from "@/lib/supabase";
import { ArrowLeft } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useToast } from "@/components/ui/toast-provider";

function CreateProgramContent() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<
    "beginner" | "intermediate" | "advanced" | "athlete"
  >("intermediate");
  const [durationWeeks, setDurationWeeks] = useState<number>(8);
  const [category, setCategory] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; color?: string }>
  >([]);
  const [saving, setSaving] = useState(false);

  // Load categories from workout_categories table (same as workouts)
  const loadCategories = useCallback(async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("workout_categories")
        .select("id, name, color")
        .eq("coach_id", user.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading categories:", error);
        return;
      }

      if (data && data.length > 0) {
        setCategories(data);
      } else {
        // Fallback if no categories exist
        setCategories([]);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      setCategories([]);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const onSave = async () => {
    if (!user?.id || !name.trim()) return;
    setSaving(true);
    try {
      // Get category name from selected categoryId
      const selectedCategory = categoryId && categoryId !== "none"
        ? categories.find((c) => c.id === categoryId)
        : null;
      const categoryName = selectedCategory?.name || null;

      const payload = {
        name,
        description,
        difficulty_level: difficulty,
        duration_weeks: durationWeeks,
        category: categoryName,
        coach_id: user.id,
        is_active: true,
      };

      const created = await WorkoutTemplateService.createProgram(payload);

      if (created?.id) {
        window.location.href = `/coach/programs/${created.id}/edit`;
      } else {
        console.error("❌ Program creation failed: createProgram returned null");
        addToast({ title: "Failed to create program. Please check the console for details and try again.", variant: "destructive" });
      }
    } catch (error) {
      console.error("❌ Error creating program:", error);
      addToast({ title: `Error creating program: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="min-h-screen p-4 sm:p-6 relative z-10 pb-32">
        <main className="max-w-4xl mx-auto">
          <div className="flex min-h-11 max-h-12 items-center justify-between gap-2 mb-4">
            <h1 className="text-lg font-semibold fc-text-primary">
              Create program
            </h1>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs px-2 shrink-0"
              onClick={() => (window.location.href = "/coach/programs")}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Button>
          </div>

          <div className="border-t border-black/5 dark:border-white/5 pt-4 space-y-3">
              {/* Program Name */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400 block mb-1">
                  Program name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., 8-Week Strength Builder"
                  className="h-9 text-sm"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                    border: `1px solid ${
                      isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                    }`,
                    color: isDark ? "#fff" : "#1A1A1A",
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400 block mb-1">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the program goals, structure, and who it's designed for..."
                  rows={3}
                  className="text-sm resize-none min-h-[4.5rem]"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                    border: `1px solid ${
                      isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                    }`,
                    color: isDark ? "#fff" : "#1A1A1A",
                  }}
                />
              </div>

              {/* Difficulty & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-400 block mb-1">
                    Difficulty
                  </label>
                  <Select
                    value={difficulty}
                    onValueChange={(v) => setDifficulty(v as any)}
                  >
                    <SelectTrigger
                      className="h-9 text-sm"
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.05)",
                        border: `1px solid ${
                          isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                        }`,
                        color: isDark ? "#fff" : "#1A1A1A",
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="athlete">Athlete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-400 block mb-1">
                    Duration (weeks)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={durationWeeks}
                    onChange={(e) =>
                      setDurationWeeks(parseInt(e.target.value || "1", 10))
                    }
                    className="h-9 text-sm"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                      border: `1px solid ${
                        isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                      }`,
                      color: isDark ? "#fff" : "#1A1A1A",
                    }}
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400 block mb-1">
                  Category{" "}
                  <span className="normal-case text-[color:var(--fc-text-dim)] font-normal">
                    (optional)
                  </span>
                </label>
                <Select
                  value={categoryId || "none"}
                  onValueChange={(v) => {
                    setCategoryId(v);
                    if (v === "none") {
                      setCategory("");
                    } else {
                      const selectedCat = categories.find((c) => c.id === v);
                      setCategory(selectedCat?.name || "");
                    }
                  }}
                >
                  <SelectTrigger
                    className="h-9 text-sm"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                      border: `1px solid ${
                        isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                      }`,
                      color: isDark ? "#fff" : "#1A1A1A",
                    }}
                  >
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (No progression guidelines)</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categories.length === 0 && (
                  <p className="text-xs fc-text-dim mt-1">
                    No categories available. Create categories in the Categories section.
                  </p>
                )}
              </div>
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-black/5 dark:border-white/5">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-sm"
                onClick={() => (window.location.href = "/coach/programs")}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-9 text-sm"
                onClick={onSave}
                disabled={saving || !name.trim()}
                style={{
                  background: getSemanticColor("success").gradient,
                  boxShadow: `0 2px 8px ${
                    getSemanticColor("success").primary
                  }28`,
                  opacity: saving || !name.trim() ? 0.5 : 1,
                }}
              >
                {saving ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </AnimatedBackground>
  );
}

export default function CreateProgramPage() {
  return (
    <ProtectedRoute requiredRole="coach">
      <CreateProgramContent />
    </ProtectedRoute>
  );
}
