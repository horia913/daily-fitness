"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import WorkoutTemplateService from "@/lib/workoutTemplateService";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Check } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useToast } from "@/components/ui/toast-provider";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import css from "@/components/coach/programs/programEditV1.module.css";

function coachDifficultyLabel(level: string): string {
  switch (level) {
    case "beginner":
      return "Beginner";
    case "intermediate":
      return "Intermediate";
    case "advanced":
      return "Athlete";
    case "athlete":
      return "Elite";
    default:
      return level;
  }
}

function CreateProgramContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const { performanceSettings } = useTheme();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<
    "beginner" | "intermediate" | "advanced" | "athlete"
  >("intermediate");
  const [durationWeeks, setDurationWeeks] = useState<number>(8);
  const [categoryId, setCategoryId] = useState<string>("none");
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; color?: string }>
  >([]);
  const [saving, setSaving] = useState(false);

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
      const selectedCategory =
        categoryId && categoryId !== "none" ? categories.find((c) => c.id === categoryId) : null;
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
        router.push(`/coach/programs/${created.id}/edit`);
      } else {
        console.error("Program creation failed: createProgram returned null");
        addToast({
          title: "Failed to create program. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating program:", error);
      addToast({
        title: `Error creating program: ${error instanceof Error ? error.message : "Unknown error"}.`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <CoachPageShell
        widthVariant="form-2xl"
        className={cn("p-4 pb-32 sm:p-6", css.wrap)}
      >
        <div className={cn(css.hero, css.heroGlowLime)}>
          <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={css.eyebrow} style={{ color: "#C5FF4A" }}>
                  New program
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    fontFamily: "var(--f-mono, Geist Mono, monospace)",
                    background: "rgba(245,194,66,0.12)",
                    color: "#F5C242",
                  }}
                >
                  Draft
                </span>
              </div>
              <h1
                className={cn(css.heroTitle, "italic text-[var(--pe-t3)]")}
                style={{ fontSize: "22px" }}
              >
                Untitled program
              </h1>
              <p
                className="text-xs text-[var(--pe-t3)]"
                style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
              >
                Add a name and details to get started
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/coach/programs")}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-[var(--pe-line)] px-3 text-[11px] font-medium text-[var(--pe-t2)] hover:text-[var(--pe-t1)] hover:bg-white/[0.04] transition-colors"
              style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </div>
          <div
            className="relative z-[1] mt-4 grid grid-cols-3 gap-2 border-t border-[var(--pe-line)] pt-4"
            style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
          >
            <div>
              <div className={cn(css.statNum, "text-[var(--pe-t4)]")}>0</div>
              <div className={css.statLbl}>Blocks</div>
            </div>
            <div>
              <div className={cn(css.statNum, "text-[var(--pe-t4)]")}>—</div>
              <div className={css.statLbl}>Weeks</div>
            </div>
            <div>
              <div className={cn(css.statNum, "text-[var(--pe-t4)]")}>0</div>
              <div className={css.statLbl}>Templates</div>
            </div>
          </div>
        </div>

        <div className={cn(css.formCard, "mt-4")}>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--pe-t3)]"
            style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
          >
            Block details
          </p>
          <div>
            <label
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]"
              style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
            >
              Program name <span className="text-[#FF5A5F]">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Program name"
              className="h-10 border border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[12.5px] text-[var(--pe-t1)] placeholder:text-[var(--pe-t4)] rounded-[10px] px-[11px] focus-visible:border-[var(--pe-cyan)] focus-visible:ring-[3px] focus-visible:ring-[rgba(79,227,232,0.12)]"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]"
              style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
            >
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — describe goals and structure"
              rows={3}
              className="min-h-[64px] resize-none border border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[12.5px] text-[var(--pe-t1)] placeholder:italic placeholder:text-[var(--pe-t4)] rounded-[10px] px-[11px] py-2 focus-visible:border-[var(--pe-cyan)] focus-visible:ring-[3px] focus-visible:ring-[rgba(79,227,232,0.12)]"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]"
                style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
              >
                Difficulty
              </label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                <SelectTrigger className="h-10 border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[12.5px] rounded-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Athlete</SelectItem>
                  <SelectItem value="athlete">Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label
                className="mb-1.5 flex flex-wrap items-baseline gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]"
                style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
              >
                Duration
                <span className="normal-case font-normal text-[var(--pe-t4)]">weeks</span>
              </label>
              <Input
                type="number"
                min={1}
                max={52}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(parseInt(e.target.value || "1", 10))}
                className="h-10 border border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[12.5px] rounded-[10px] px-[11px]"
              />
            </div>
          </div>
          <div>
            <label
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]"
              style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
            >
              Category <span className="normal-case font-normal text-[var(--pe-t4)]">(optional)</span>
            </label>
            <Select
              value={categoryId}
              onValueChange={(v) => {
                setCategoryId(v);
              }}
            >
              <SelectTrigger className="h-10 border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[12.5px] rounded-[10px]">
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
            {categories.length === 0 ? (
              <p className="mt-1 text-xs text-[var(--pe-t3)]">
                No categories available. Create categories in the Categories section.
              </p>
            ) : null}
          </div>
        </div>

        <p
          className="mt-3 text-[11px] text-[var(--pe-t3)]"
          style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
        >
          Preview: {coachDifficultyLabel(difficulty)} · {durationWeeks} weeks
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/coach/programs")}
            className="h-10 rounded-lg px-4 text-[12.5px] font-semibold text-[var(--pe-t2)] hover:text-[var(--pe-t1)]"
            style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving || !name.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[12.5px] font-semibold text-[#0a1a18] disabled:opacity-50"
            style={{
              fontFamily: "var(--font-geist-sans, Geist, sans-serif)",
              background: "linear-gradient(90deg, #C5FF4A, #7FE89A)",
            }}
          >
            <Check className="h-4 w-4" />
            {saving ? "Creating..." : "Save"}
          </button>
        </div>
      </CoachPageShell>
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
