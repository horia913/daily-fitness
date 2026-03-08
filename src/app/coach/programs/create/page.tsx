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
import { BookOpen, ArrowLeft, Info } from "lucide-react";
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
      <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:p-12 relative z-10">
        <main className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm fc-text-dim mb-4 font-mono uppercase tracking-widest">
            <button
              type="button"
              onClick={() => (window.location.href = "/coach/programs")}
              className="hover:fc-text-primary transition-colors"
            >
              Programs
            </button>
            <span className="fc-text-subtle">/</span>
            <span className="fc-text-primary">New Creation</span>
          </nav>
          <header className="mb-10">
            <h1 className="text-2xl font-bold tracking-tight fc-text-primary mb-2">
              Create Training Program
            </h1>
            <p className="fc-text-dim">
              Define the blueprint for your client&apos;s success.
            </p>
          </header>
          <div className="space-y-6">

          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 md:p-10">
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-[color:var(--fc-text-primary)]">
                  Program Basics
                </h2>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  Name, description, difficulty, and duration.
                </p>
              </div>
              {/* Program Name */}
              <div>
                <label
                  className="text-sm font-semibold block mb-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
                  }}
                >
                  Program Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., 8-Week Strength Builder"
                  className="text-base"
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
                <label
                  className="text-sm font-semibold block mb-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
                  }}
                >
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the program goals, structure, and who it's designed for..."
                  rows={4}
                  className="text-base resize-none"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="text-sm font-semibold block mb-2"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Difficulty Level
                  </label>
                  <Select
                    value={difficulty}
                    onValueChange={(v) => setDifficulty(v as any)}
                  >
                    <SelectTrigger
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
                  <label
                    className="text-sm font-semibold block mb-2"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.9)",
                    }}
                  >
                    Duration (Weeks)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={durationWeeks}
                    onChange={(e) =>
                      setDurationWeeks(parseInt(e.target.value || "1", 10))
                    }
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
                <label
                  className="text-sm font-semibold block mb-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
                  }}
                >
                  Training Category
                    <span className="text-xs fc-text-dim ml-2">
                    (optional - for volume calculator)
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
            </div>

            {/* Action Buttons */}
            <div
              className="flex items-center justify-end gap-3 mt-8 pt-6"
              style={{
                borderTop: `1px solid ${
                  isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                }`,
              }}
            >
              <Button
                variant="ghost"
                onClick={() => (window.location.href = "/coach/programs")}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={onSave}
                disabled={saving || !name.trim()}
                className="rounded-xl"
                style={{
                  background: getSemanticColor("success").gradient,
                  boxShadow: `0 4px 12px ${
                    getSemanticColor("success").primary
                  }30`,
                  opacity: saving || !name.trim() ? 0.5 : 1,
                }}
              >
                {saving ? "Creating..." : "Create Program"}
              </Button>
            </div>
          </div>

          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4">
            <div className="flex items-start gap-3">
              <Info
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                style={{
                  color: getSemanticColor("trust").primary,
                }}
              />
              <div>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  After creating the program, you&apos;ll be able to configure the
                  weekly schedule, assign workout templates to specific days,
                  and set up progression rules for each week.
                </p>
              </div>
            </div>
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
