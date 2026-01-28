"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
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

function CreateProgramContent() {
  const { user } = useAuth();
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
      
      console.log("🔍 Creating program with payload:", payload);
      
      const created = await WorkoutTemplateService.createProgram(payload);
      
      console.log("🔍 Create program result:", created);
      
      if (created?.id) {
        console.log("✅ Program created successfully, redirecting to:", `/coach/programs/${created.id}/edit`);
        window.location.href = `/coach/programs/${created.id}/edit`;
      } else {
        console.error("❌ Program creation failed: createProgram returned null");
        alert("Failed to create program. Please check the console for details and try again.");
      }
    } catch (error) {
      console.error("❌ Error creating program:", error);
      alert(`Error creating program: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <GlassCard elevation={3} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                onClick={() => (window.location.href = "/coach/programs")}
                className="fc-btn fc-btn-ghost h-10 w-10"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  Program Builder
                </span>
                <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)]">
                  Create Training Program
                </h1>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  Build a structured multi-week program for your clients.
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard elevation={2} className="fc-glass fc-card p-6">
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
                  <span className="text-xs text-slate-500 ml-2">
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
                  <p className="text-xs text-slate-500 mt-1">
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
          </GlassCard>

          <GlassCard elevation={1} className="fc-glass-soft fc-card p-4">
            <div className="flex items-start gap-3">
              <Info
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                style={{
                  color: getSemanticColor("trust").primary,
                }}
              />
              <div>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  After creating the program, you'll be able to configure the
                  weekly schedule, assign workout templates to specific days,
                  and set up progression rules for each week.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
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
