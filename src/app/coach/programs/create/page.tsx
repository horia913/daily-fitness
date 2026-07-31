"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import WorkoutTemplateService from "@/lib/workoutTemplateService";
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
import {
  PERIODIZATION_STYLE_NONE,
  PERIODIZATION_STYLES,
} from "@/lib/programs/periodizationStyles";

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
  const [programType, setProgramType] = useState<"fixed" | "recurring">("fixed");
  const [periodizationStyle, setPeriodizationStyle] = useState<string>(PERIODIZATION_STYLE_NONE);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!user?.id || !name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        difficulty_level: difficulty,
        coach_id: user.id,
        is_active: true,
        type: programType,
        periodization_style:
          periodizationStyle === PERIODIZATION_STYLE_NONE ? null : periodizationStyle,
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
        className={cn("p-4 pb-[var(--fc-bottom-safe-area)] sm:p-6", css.wrap)}
      >
        <div className={cn(css.hero, css.heroGlowAction)}>
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
            className="relative z-[1] mt-4 grid grid-cols-2 gap-2 border-t border-[var(--pe-line)] pt-4"
            style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
          >
            <div>
              <div className={cn(css.statNum, "text-[var(--pe-t4)]")}>0</div>
              <div className={css.statLbl}>Phases</div>
            </div>
            <div>
              <div className={cn(css.statNum, "text-[var(--pe-t4)]")}>—</div>
              <div className={css.statLbl}>Weeks</div>
            </div>
          </div>
        </div>

        <div className={cn(css.formCard, "mt-4")}>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--pe-t3)]"
            style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
          >
            Program details
          </p>
          <div>
            <label
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]"
              style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
            >
              Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProgramType("fixed")}
                className={cn(
                  "flex-1 h-10 rounded-[10px] border text-[12.5px] font-semibold transition-colors",
                  programType === "fixed"
                    ? "border-[var(--fc-accent)] bg-[color:var(--fc-group-c-soft)] text-[var(--pe-t1)]"
                    : "border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[var(--pe-t3)]",
                )}
              >
                Fixed
              </button>
              <button
                type="button"
                onClick={() => setProgramType("recurring")}
                className={cn(
                  "flex-1 h-10 rounded-[10px] border text-[12.5px] font-semibold transition-colors",
                  programType === "recurring"
                    ? "border-[var(--fc-accent)] bg-[color:var(--fc-group-c-soft)] text-[var(--pe-t1)]"
                    : "border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[var(--pe-t3)]",
                )}
              >
                Recurring
              </button>
            </div>
            {programType === "recurring" ? (
              <p className="mt-1.5 text-xs text-[var(--pe-t3)]">
                Single repeating week — no training phases or end date.
              </p>
            ) : null}
          </div>
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
              className="h-10 border border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[12.5px] text-[var(--pe-t1)] placeholder:text-[var(--pe-t4)] rounded-[10px] px-[11px] focus-visible:border-[var(--fc-accent)] focus-visible:ring-[3px] focus-visible:ring-[rgba(34, 211, 238, 0.12)]"
            />
          </div>
          {programType === "fixed" ? (
            <div>
              <label
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]"
                style={{ fontFamily: "var(--f-mono, Geist Mono, monospace)" }}
              >
                Periodization style
              </label>
              <Select value={periodizationStyle} onValueChange={setPeriodizationStyle}>
                <SelectTrigger className="h-10 border border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[12.5px] text-[var(--pe-t1)] rounded-[10px]">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PERIODIZATION_STYLE_NONE}>None</SelectItem>
                  {PERIODIZATION_STYLES.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
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
              className="min-h-[64px] resize-none border border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[12.5px] text-[var(--pe-t1)] placeholder:italic placeholder:text-[var(--pe-t4)] rounded-[10px] px-[11px] py-2 focus-visible:border-[var(--fc-accent)] focus-visible:ring-[3px] focus-visible:ring-[rgba(34, 211, 238, 0.12)]"
            />
          </div>
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
            <p className="mt-2 text-xs text-[var(--pe-t3)]">
              Program length is set by phases in the Station after you create the program.
            </p>
          </div>
        </div>

        <p
          className="mt-3 text-[11px] text-[var(--pe-t3)]"
          style={{ fontFamily: "var(--font-geist-sans, Geist, sans-serif)" }}
        >
          Preview: {coachDifficultyLabel(difficulty)}
          {programType === "fixed" ? " · Set length in phases" : " · Recurring (1 week)"}
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
