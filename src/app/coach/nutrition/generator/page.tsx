"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/ui/toast-provider";
import { supabase } from "@/lib/supabase";
import {
  saveGeneratedPlan,
  autoMacros,
  getSwapAlternatives,
  swapFood,
  adjustPortion,
  type GeneratorConfig,
  type GeneratorResult,
  type GeneratedMeal,
  type GeneratedOption,
  type GeneratedFood,
  type FoodRecord,
  type MacroTargets,
} from "@/lib/mealPlanGeneratorService";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Check,
  Search,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface RestrictionPreset {
  id: string;
  name: string;
  display_name: string;
  excluded_tags: string[];
}

interface FoodSearchResult {
  id: string;
  name: string;
}

interface SwapModalState {
  mealIdx: number;
  optionIdx: number;
  foodIdx: number;
  slotType: string;
  currentFood: GeneratedFood;
}

type Step = 1 | 2 | 3;

const MEAL_STYLE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  breakfast: [
    { value: "", label: "No preference" },
    { value: "smoothie", label: "Smoothie" },
    { value: "yogurt_bowl", label: "Yogurt bowl" },
    { value: "oats_bowl", label: "Oats bowl" },
    { value: "eggs_breakfast", label: "Eggs" },
    { value: "toast_sandwich", label: "Toast / sandwich" },
  ],
  lunch: [
    { value: "", label: "No preference" },
    { value: "rice_bowl", label: "Rice bowl" },
    { value: "wrap", label: "Wrap" },
    { value: "salad", label: "Salad" },
    { value: "sandwich", label: "Sandwich" },
    { value: "plated", label: "Plated" },
    { value: "pasta", label: "Pasta" },
  ],
  dinner: [
    { value: "", label: "No preference" },
    { value: "salad", label: "Salad" },
    { value: "rice_bowl", label: "Rice bowl" },
    { value: "plated", label: "Plated" },
    { value: "pasta", label: "Pasta" },
    // wrap, soup: no dinner templates — removed to avoid impossible selection
  ],
  snack: [
    { value: "", label: "No preference" },
    { value: "smoothie", label: "Smoothie" },
    { value: "yogurt_bowl", label: "Yogurt bowl" },
    { value: "fruit_protein", label: "Fruit + protein" },
    { value: "quick_snack", label: "Quick snack" },
    // sandwich: no snack templates — removed
  ],
};

// ============================================================================
// HELPERS
// ============================================================================

function fmt1(n: number) {
  return Math.round(n * 10) / 10;
}

function deviationColor(pct: number) {
  if (pct <= 7) return "text-[color:var(--fc-status-success)]";
  if (pct <= 15) return "text-[color:var(--fc-status-warning)]";
  return "text-[color:var(--fc-status-error)]";
}

function deviationBg(pct: number) {
  if (pct <= 7) return "bg-[color:var(--fc-status-success)]/15 text-[color:var(--fc-status-success)]";
  if (pct <= 15) return "bg-[color:var(--fc-status-warning)]/15 text-[color:var(--fc-status-warning)]";
  return "bg-[color:var(--fc-status-error)]/15 text-[color:var(--fc-status-error)]";
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StepIndicator({ current, step }: { current: Step; step: number }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
          done
            ? "bg-[color:var(--fc-status-success)] text-white"
            : active
            ? "bg-[color:var(--fc-accent)] text-white"
            : "bg-[color:var(--fc-glass-border)] text-[color:var(--fc-text-dim)]"
        }`}
      >
        {done ? <Check className="w-4 h-4" /> : step}
      </div>
    </div>
  );
}

function MacroBar({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 120) : 0;
  const deviation = target > 0 ? Math.abs((value - target) / target) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[color:var(--fc-text-dim)]">{label}</span>
        <span className={deviationColor(deviation)}>
          {fmt1(value)}g / {target}g
        </span>
      </div>
      <div className="h-1.5 bg-[color:var(--fc-glass-border)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            deviation <= 7 ? "bg-[color:var(--fc-status-success)]" : deviation <= 15 ? "bg-[color:var(--fc-status-warning)]" : "bg-[color:var(--fc-status-error)]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Standalone food search — uses a React portal so the dropdown is never clipped by
// any parent's overflow:hidden (GlassCard hardcodes overflow-hidden).
function FoodSearchBox({
  placeholder,
  onSelect,
  sessionReady = true,
}: {
  placeholder: string;
  onSelect: (food: FoodSearchResult) => void;
  sessionReady?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  };

  const handleChange = (q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    if (!sessionReady) return; // session not yet refreshed — skip search
    updatePosition();
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from("foods").select("id, name").ilike("name", `%${q}%`).limit(10);
        setResults((data ?? []) as FoodSearchResult[]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleFocus = () => {
    if (results.length > 0) { updatePosition(); setOpen(true); }
  };

  const handleBlur = () => {
    // Small delay so onMouseDown on a result fires before the close
    setTimeout(() => setOpen(false), 150);
  };

  const dropdown = (open && mounted) ? ReactDOM.createPortal(
    <div
      style={{
        ...dropdownStyle,
        background: "var(--fc-glass-base, rgba(15,15,25,0.97))",
        border: "1px solid var(--fc-glass-border, rgba(255,255,255,0.12))",
        borderRadius: "12px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        overflow: "hidden",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {results.length > 0 ? results.map((f) => (
        <button
          key={f.id}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(f);
            setQuery("");
            setResults([]);
            setOpen(false);
          }}
          style={{ borderBottom: "1px solid var(--fc-glass-border, rgba(255,255,255,0.08))" }}
          className="w-full text-left px-4 py-3 text-sm text-[color:var(--fc-text-primary)] hover:bg-[color:var(--fc-aurora)]/10 transition-colors last:border-0"
        >
          {f.name}
        </button>
      )) : (
        <div className="px-4 py-3 text-sm text-[color:var(--fc-text-dim)]">
          No foods found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--fc-text-dim)] pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={!sessionReady}
        placeholder={sessionReady ? placeholder : "Loading…"}
        className={`w-full pl-9 pr-9 py-2.5 rounded-xl text-sm fc-surface border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)] placeholder:text-[color:var(--fc-text-dim)] focus:outline-none focus:border-[color:var(--fc-accent)] transition-colors ${!sessionReady ? "opacity-50 cursor-not-allowed" : ""}`}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[color:var(--fc-text-dim)]" />
      )}
      {dropdown}
    </div>
  );
}

function FoodRow({
  food,
  onAdjust,
  onSwap,
}: {
  food: GeneratedFood;
  onAdjust: (delta: number) => void;
  onSwap: () => void;
}) {
  return (
    <tr className="border-b border-[color:var(--fc-glass-border)] last:border-0 hover:bg-[color:var(--fc-aurora)]/5 transition-colors">
      <td className="py-2 pr-3">
        <div className="text-sm font-medium text-[color:var(--fc-text-primary)] leading-tight">
          {food.foodName}
        </div>
        <div className="text-xs text-[color:var(--fc-text-dim)] mt-0.5">{food.slotName}</div>
      </td>
      <td className="py-2 px-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onAdjust(-5)}
            className="w-5 h-5 rounded flex items-center justify-center bg-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-aurora)]/20 transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-sm font-mono text-[color:var(--fc-text-primary)] w-10 text-center">
            {food.portionGrams}g
          </span>
          <button
            onClick={() => onAdjust(5)}
            className="w-5 h-5 rounded flex items-center justify-center bg-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-aurora)]/20 transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </td>
      <td className="py-2 px-2 text-right text-sm text-[color:var(--fc-text-primary)]">{fmt1(food.calories)}</td>
      <td className="py-2 px-2 text-right text-sm text-[color:var(--fc-text-primary)]">{fmt1(food.protein)}</td>
      <td className="py-2 px-2 text-right text-sm text-[color:var(--fc-text-primary)]">{fmt1(food.carbs)}</td>
      <td className="py-2 px-2 text-right text-sm text-[color:var(--fc-text-primary)]">{fmt1(food.fat)}</td>
      <td className="py-2 pl-2 text-right">
        <button
          onClick={onSwap}
          className="p-1.5 rounded-lg text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-accent)] hover:bg-[color:var(--fc-aurora)]/10 transition-colors"
          title="Swap this food"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function GeneratorPage() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const router = useRouter();
  const { addToast } = useToast();

  // ----- Step state -----
  const [step, setStep] = useState<Step>(1);

  // ----- Step 1: Targets -----
  const [planName, setPlanName] = useState("");
  const [targetKcal, setTargetKcal] = useState<number>(2000);
  const [macroMode, setMacroMode] = useState<"auto" | "manual">("auto");
  const [manualProtein, setManualProtein] = useState<number>(0);
  const [manualCarbs, setManualCarbs] = useState<number>(0);
  const [manualFat, setManualFat] = useState<number>(0);
  const [manualFiber, setManualFiber] = useState<number>(25);
  const [mealCount, setMealCount] = useState<number>(4);
  const [optionsPerMeal, setOptionsPerMeal] = useState<number>(3);

  // Derived auto macros
  const computed = autoMacros(targetKcal);
  const manualKcalSum = manualProtein * 4 + manualCarbs * 4 + manualFat * 9;
  const manualMatchesTarget = Math.abs(manualKcalSum - targetKcal) <= 50;

  // When switching to manual, pre-fill with auto values
  useEffect(() => {
    if (macroMode === "manual") {
      setManualProtein(computed.protein);
      setManualCarbs(computed.carbs);
      setManualFat(computed.fat);
      setManualFiber(computed.fiber);
    }
  }, [macroMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Step 2: Food Rules -----
  const [presets, setPresets] = useState<RestrictionPreset[]>([]);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [excludedFoods, setExcludedFoods] = useState<FoodSearchResult[]>([]);
  const [requiredFoods, setRequiredFoods] = useState<FoodSearchResult[]>([]);
  const [breakfastStyle, setBreakfastStyle] = useState<string>("");
  const [lunchStyle, setLunchStyle] = useState<string>("");
  const [dinnerStyle, setDinnerStyle] = useState<string>("");
  const [snackStyle, setSnackStyle] = useState<string>("");
  // Tracks whether the Supabase session has been refreshed for this mount.
  // On client-side navigation the middleware does NOT run, so the access token
  // can be stale. We refresh once per mount before any query runs.
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(() => {
      if (!cancelled) setSessionReady(true);
    });
    return () => { cancelled = true; };
  }, []); // runs on every mount — including after navigate-away-and-back

  useEffect(() => {
    if (!sessionReady) return;
    let cancelled = false;
    supabase
      .from("restriction_presets")
      .select("*")
      .order("display_name")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error("Failed to load restriction presets:", error.message); return; }
        if (data) setPresets(data as RestrictionPreset[]);
      });
    return () => { cancelled = true; };
  }, [sessionReady]);

  // Derived excluded tags from selected presets
  const excludedTags = Array.from(
    new Set(
      presets
        .filter((p) => selectedPresets.has(p.name))
        .flatMap((p) => p.excluded_tags)
    )
  );

  // ----- Step 3: Review -----
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [foodsBySlot, setFoodsBySlot] = useState<Map<string, FoodRecord[]>>(new Map());
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [openMealIdx, setOpenMealIdx] = useState<number>(0);
  const [activeTabPerMeal, setActiveTabPerMeal] = useState<Record<number, number>>({});
  // Local copies of options for swap/adjust (keyed by `${mealIdx}-${optionIdx}`)
  const [localOptions, setLocalOptions] = useState<Record<string, GeneratedOption>>({});
  const [swapModal, setSwapModal] = useState<SwapModalState | null>(null);
  const [saving, setSaving] = useState(false);

  const GENERATION_TIMEOUT_MS = 60000; // 60s safety net only; root cause was getSession() in service (removed)
  const cancelledRef = useRef(false);

  const cancelGeneration = () => {
    cancelledRef.current = true;
    setGenerating(false);
    setGenerationError("Generation was cancelled. You can try again.");
  };

  const runGeneration = async () => {
    if (!user) return;
    cancelledRef.current = false;
    setGenerating(true);
    setGenerationError(null);
    setResult(null);
    setLocalOptions({});

    const config: GeneratorConfig = {
      planName: planName || "Generated Meal Plan",
      targetKcal,
      targetProtein: macroMode === "manual" ? manualProtein : undefined,
      targetCarbs: macroMode === "manual" ? manualCarbs : undefined,
      targetFat: macroMode === "manual" ? manualFat : undefined,
      targetFiber: macroMode === "manual" ? manualFiber : undefined,
      mealCount,
      optionsPerMeal,
      excludedTags,
      excludedFoodIds: excludedFoods.map((f) => f.id),
      requiredFoodIds: requiredFoods.map((f) => f.id),
      tolerance: 0.07,
      breakfastStyle: breakfastStyle || null,
      lunchStyle: lunchStyle || null,
      dinnerStyle: dinnerStyle || null,
      snackStyle: snackStyle || null,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
      const res = await fetch("/api/coach/nutrition/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (cancelledRef.current) return;
      const data = await res.json();
      if (!res.ok) {
        const validationErrors = data?.validationErrors as string[] | undefined;
        const msg = validationErrors?.length
          ? [data?.error ?? "Configuration invalid", ...validationErrors].join("\n")
          : data?.error ?? res.statusText ?? "Generation failed.";
        setGenerationError(msg);
        return;
      }
      setResult(data.result);
      setFoodsBySlot(
        data.foodsBySlot && typeof data.foodsBySlot === "object"
          ? new Map(Object.entries(data.foodsBySlot) as [string, FoodRecord[]][])
          : new Map()
      );
      setOpenMealIdx(0);
      setActiveTabPerMeal({});
    } catch (err) {
      if (cancelledRef.current) return;
      console.error("Generation error:", err);
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Generation took too long. Check your connection and try again."
          : err instanceof Error
            ? err.message
            : "Generation failed. Please try again.";
      setGenerationError(message);
    } finally {
      if (!cancelledRef.current) setGenerating(false);
    }
  };

  const handleGoToReview = () => {
    setStep(3);
    runGeneration();
  };

  // Local option helpers
  const getOption = (mealIdx: number, optionIdx: number): GeneratedOption | undefined => {
    const key = `${mealIdx}-${optionIdx}`;
    if (localOptions[key]) return localOptions[key];
    return result?.meals[mealIdx]?.options[optionIdx];
  };

  const setOption = (mealIdx: number, optionIdx: number, option: GeneratedOption) => {
    setLocalOptions((prev) => ({ ...prev, [`${mealIdx}-${optionIdx}`]: option }));
  };

  const handleAdjust = (mealIdx: number, optionIdx: number, foodIdx: number, delta: number) => {
    const opt = getOption(mealIdx, optionIdx);
    if (!opt) return;
    setOption(mealIdx, optionIdx, adjustPortion(opt, foodIdx, delta));
  };

  const handleSwap = (mealIdx: number, optionIdx: number, foodIdx: number) => {
    const opt = getOption(mealIdx, optionIdx);
    if (!opt) return;
    const food = opt.foods[foodIdx];
    setSwapModal({ mealIdx, optionIdx, foodIdx, slotType: food.slotType, currentFood: food });
  };

  const handleSwapConfirm = (newFood: FoodRecord) => {
    if (!swapModal) return;
    const { mealIdx, optionIdx, foodIdx } = swapModal;
    const opt = getOption(mealIdx, optionIdx);
    if (!opt) return;
    setOption(mealIdx, optionIdx, swapFood(opt, foodIdx, newFood));
    setSwapModal(null);
  };

  const handleSave = async () => {
    if (!user || !result) return;
    setSaving(true);
    try {
      // Merge localOptions back into the result meals before saving
      const mergedResult = {
        ...result,
        meals: result.meals.map((meal, mealIdx) => ({
          ...meal,
          options: meal.options.map((opt, optIdx) => getOption(mealIdx, optIdx) ?? opt),
        })),
      };
      const planId = await saveGeneratedPlan(mergedResult, user.id);
      addToast({ title: "Plan Saved", description: "Your meal plan has been saved successfully." });
      router.push(`/coach/nutrition/meal-plans/${planId}`);
    } catch (err) {
      console.error("Save error:", err);
      addToast({
        title: "Save Failed",
        description: err instanceof Error ? err.message : "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // RENDER — STEP NAVIGATION BAR
  // ============================================================================
  const stepLabels = ["Targets", "Food Rules", "Review"];

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 min-w-0 overflow-x-hidden px-4 sm:px-6 py-6 pb-32 max-w-5xl mx-auto space-y-6">

          {/* Back link */}
          <Link
            href="/coach/nutrition"
            className="fc-surface inline-flex items-center gap-2 rounded-xl border border-[color:var(--fc-surface-card-border)] px-3 py-2 w-fit text-[color:var(--fc-text-primary)] text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Nutrition
          </Link>

          {/* Page header */}
          <GlassCard elevation={2} className="fc-glass fc-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[color:var(--fc-text-primary)]">Meal Plan Generator</h1>
                <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                  Auto-generate a full-day meal plan with multiple options per meal
                </p>
              </div>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-3 mt-6">
              {stepLabels.map((label, i) => (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-2">
                    <StepIndicator current={step} step={i + 1} />
                    <span className={`text-sm font-medium ${step === i + 1 ? "text-[color:var(--fc-text-primary)]" : "text-[color:var(--fc-text-dim)]"}`}>
                      {label}
                    </span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div className="flex-1 h-px bg-[color:var(--fc-glass-border)]" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </GlassCard>

          {/* ================================================================
              STEP 1: TARGETS
          ================================================================ */}
          {step === 1 && (
            <GlassCard elevation={2} className="fc-glass fc-card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">Step 1 — Targets</h2>

              {/* Plan name */}
              <div className="space-y-1.5">
                <Label className="text-[color:var(--fc-text-primary)]">Plan Name</Label>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. John's 2000 kcal Bulk Plan"
                  className="fc-surface border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)]"
                />
              </div>

              {/* Daily calories */}
              <div className="space-y-1.5">
                <Label className="text-[color:var(--fc-text-primary)]">Daily Calories (kcal) *</Label>
                <Input
                  type="number"
                  min={800}
                  max={6000}
                  value={targetKcal}
                  onChange={(e) => setTargetKcal(Number(e.target.value))}
                  className="fc-surface border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)] w-48"
                />
              </div>

              {/* Macro mode toggle */}
              <div className="space-y-3">
                <Label className="text-[color:var(--fc-text-primary)]">Macros</Label>
                <div className="flex gap-2">
                  {(["auto", "manual"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setMacroMode(mode)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                        macroMode === mode
                          ? "bg-[color:var(--fc-accent)] text-white"
                          : "fc-surface border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-dim)]"
                      }`}
                    >
                      {mode === "auto" ? "Auto-Calculate" : "Manual"}
                    </button>
                  ))}
                </div>

                {macroMode === "auto" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Protein", value: computed.protein, unit: "g" },
                      { label: "Carbs", value: computed.carbs, unit: "g" },
                      { label: "Fat", value: computed.fat, unit: "g" },
                      { label: "Fiber", value: computed.fiber, unit: "g" },
                    ].map(({ label, value, unit }) => (
                      <div key={label} className="fc-surface border border-[color:var(--fc-glass-border)] rounded-xl p-3">
                        <div className="text-xs text-[color:var(--fc-text-dim)]">{label}</div>
                        <div className="text-xl font-bold text-[color:var(--fc-text-primary)] mt-0.5">
                          {value}<span className="text-sm font-normal ml-1 text-[color:var(--fc-text-dim)]">{unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Protein (g)", value: manualProtein, set: setManualProtein },
                        { label: "Carbs (g)", value: manualCarbs, set: setManualCarbs },
                        { label: "Fat (g)", value: manualFat, set: setManualFat },
                        { label: "Fiber (g)", value: manualFiber, set: setManualFiber },
                      ].map(({ label, value, set }) => (
                        <div key={label} className="space-y-1">
                          <Label className="text-xs text-[color:var(--fc-text-dim)]">{label}</Label>
                          <Input
                            type="number"
                            min={0}
                            value={value}
                            onChange={(e) => set(Number(e.target.value))}
                            className="fc-surface border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)]"
                          />
                        </div>
                      ))}
                    </div>
                    <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${manualMatchesTarget ? "bg-[color:var(--fc-status-success)]/10 text-[color:var(--fc-status-success)]" : "bg-[color:var(--fc-status-warning)]/10 text-[color:var(--fc-status-warning)]"}`}>
                      {manualMatchesTarget ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                      {manualProtein * 4 + manualCarbs * 4 + manualFat * 9} kcal from macros
                      {!manualMatchesTarget && ` (target: ${targetKcal} kcal — ${Math.abs(manualKcalSum - targetKcal)} kcal difference)`}
                    </div>
                  </div>
                )}
              </div>

              {/* Meals per day + options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[color:var(--fc-text-primary)]">Meals Per Day</Label>
                  <select
                    value={mealCount}
                    onChange={(e) => setMealCount(Number(e.target.value))}
                    className="w-full fc-surface border border-[color:var(--fc-glass-border)] rounded-xl px-3 py-2 text-sm text-[color:var(--fc-text-primary)] bg-transparent"
                  >
                    {[3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} meals</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[color:var(--fc-text-primary)]">Options Per Meal</Label>
                  <select
                    value={optionsPerMeal}
                    onChange={(e) => setOptionsPerMeal(Number(e.target.value))}
                    className="w-full fc-surface border border-[color:var(--fc-glass-border)] rounded-xl px-3 py-2 text-sm text-[color:var(--fc-text-primary)] bg-transparent"
                  >
                    {[1, 2, 3].map((n) => <option key={n} value={n}>{n} option{n > 1 ? "s" : ""}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!targetKcal || targetKcal < 800}
                  className="fc-btn fc-btn-primary"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </GlassCard>
          )}

          {/* ================================================================
              STEP 2: FOOD RULES
          ================================================================ */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Dietary restrictions */}
              <GlassCard elevation={2} className="fc-glass fc-card p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">Step 2 — Food Rules</h2>
                  <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                    Choose dietary restrictions and search the food database to exclude or require specific foods.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-[color:var(--fc-text-primary)] font-semibold">Dietary Restrictions</Label>
                  <p className="text-xs text-[color:var(--fc-text-dim)]">
                    Tick any that apply — all matching foods are removed from every generated option.
                  </p>
                {!sessionReady || presets.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-[color:var(--fc-text-dim)]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading restrictions…
                  </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {presets.map((p) => {
                        const checked = selectedPresets.has(p.name);
                        return (
                          <button
                            key={p.name}
                            onClick={() => {
                              const next = new Set(selectedPresets);
                              if (checked) next.delete(p.name); else next.add(p.name);
                              setSelectedPresets(next);
                            }}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all border ${
                              checked
                                ? "bg-[color:var(--fc-accent)]/15 border-[color:var(--fc-accent)] text-[color:var(--fc-text-primary)]"
                                : "fc-surface border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)]"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${checked ? "bg-[color:var(--fc-accent)] border-[color:var(--fc-accent)]" : "border-[color:var(--fc-glass-border)]"}`}>
                              {checked && <Check className="w-3 h-3 text-white" />}
                            </div>
                            {p.display_name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {excludedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="text-xs text-[color:var(--fc-text-dim)] mr-1 self-center">Excluding tags:</span>
                      {excludedTags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-[color:var(--fc-status-error)]/15 text-[color:var(--fc-status-error)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Meal styles — optional per meal type */}
              <GlassCard elevation={2} className="fc-glass fc-card p-6 space-y-4">
                <div>
                  <Label className="text-[color:var(--fc-text-primary)] font-semibold">Meal Styles</Label>
                  <p className="text-xs text-[color:var(--fc-text-dim)] mt-1">
                    Optionally restrict each meal type to a specific style. Leave as &quot;No preference&quot; for maximum variety.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[color:var(--fc-text-dim)]">Breakfast</Label>
                    <select
                      value={breakfastStyle}
                      onChange={(e) => setBreakfastStyle(e.target.value)}
                      className="w-full fc-surface border border-[color:var(--fc-glass-border)] rounded-xl px-3 py-2 text-sm text-[color:var(--fc-text-primary)] bg-transparent"
                    >
                      {MEAL_STYLE_OPTIONS.breakfast.map((o) => (
                        <option key={o.value || "_none"} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[color:var(--fc-text-dim)]">Lunch</Label>
                    <select
                      value={lunchStyle}
                      onChange={(e) => setLunchStyle(e.target.value)}
                      className="w-full fc-surface border border-[color:var(--fc-glass-border)] rounded-xl px-3 py-2 text-sm text-[color:var(--fc-text-primary)] bg-transparent"
                    >
                      {MEAL_STYLE_OPTIONS.lunch.map((o) => (
                        <option key={o.value || "_none"} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[color:var(--fc-text-dim)]">Dinner</Label>
                    <select
                      value={dinnerStyle}
                      onChange={(e) => setDinnerStyle(e.target.value)}
                      className="w-full fc-surface border border-[color:var(--fc-glass-border)] rounded-xl px-3 py-2 text-sm text-[color:var(--fc-text-primary)] bg-transparent"
                    >
                      {MEAL_STYLE_OPTIONS.dinner.map((o) => (
                        <option key={o.value || "_none"} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  {mealCount >= 4 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-[color:var(--fc-text-dim)]">Snack</Label>
                      <select
                        value={snackStyle}
                        onChange={(e) => setSnackStyle(e.target.value)}
                        className="w-full fc-surface border border-[color:var(--fc-glass-border)] rounded-xl px-3 py-2 text-sm text-[color:var(--fc-text-primary)] bg-transparent"
                      >
                        {MEAL_STYLE_OPTIONS.snack.map((o) => (
                          <option key={o.value || "_none"} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Exclude specific foods — separate card so dropdown is never clipped */}
              <GlassCard elevation={2} className="fc-glass fc-card p-6 space-y-3">
                <div>
                  <Label className="text-[color:var(--fc-text-primary)] font-semibold">Exclude Specific Foods</Label>
                  <p className="text-xs text-[color:var(--fc-text-dim)] mt-1">
                    Search the food database and add individual foods to ban from the plan.
                  </p>
                </div>
                <FoodSearchBox
                  placeholder="Type a food name, e.g. &quot;Salmon&quot; or &quot;Greek yogurt&quot;…"
                  sessionReady={sessionReady}
                  onSelect={(f) => {
                    if (!excludedFoods.find((e) => e.id === f.id))
                      setExcludedFoods((prev) => [...prev, f]);
                  }}
                />
                {excludedFoods.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {excludedFoods.map((f) => (
                      <span key={f.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[color:var(--fc-status-error)]/10 text-[color:var(--fc-status-error)] border border-[color:var(--fc-status-error)]/30 font-medium">
                        {f.name}
                        <button onClick={() => setExcludedFoods((prev) => prev.filter((e) => e.id !== f.id))} className="opacity-70 hover:opacity-100">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* Required foods — separate card */}
              <GlassCard elevation={2} className="fc-glass fc-card p-6 space-y-3">
                <div>
                  <Label className="text-[color:var(--fc-text-primary)] font-semibold">Required Foods</Label>
                  <p className="text-xs text-[color:var(--fc-text-dim)] mt-1">
                    Search the food database and pin foods that must appear in the plan. The generator will prefer these wherever possible.
                  </p>
                </div>
                <FoodSearchBox
                  placeholder="Type a food name, e.g. &quot;Chicken breast&quot; or &quot;Oats&quot;…"
                  sessionReady={sessionReady}
                  onSelect={(f) => {
                    if (!requiredFoods.find((r) => r.id === f.id))
                      setRequiredFoods((prev) => [...prev, f]);
                  }}
                />
                {requiredFoods.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {requiredFoods.map((f) => (
                      <span key={f.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[color:var(--fc-status-success)]/10 text-[color:var(--fc-status-success)] border border-[color:var(--fc-status-success)]/30 font-medium">
                        {f.name}
                        <button onClick={() => setRequiredFoods((prev) => prev.filter((r) => r.id !== f.id))} className="opacity-70 hover:opacity-100">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </GlassCard>

              <GlassCard elevation={2} className="fc-glass fc-card p-5 flex justify-between items-center">
                <Button onClick={() => setStep(1)} className="fc-btn fc-btn-secondary">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleGoToReview} className="fc-btn fc-btn-primary">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Plan
                </Button>
              </GlassCard>
            </div>
          )}

          {/* ================================================================
              STEP 3: REVIEW
          ================================================================ */}
          {step === 3 && (
            <div className="space-y-4">

              {/* Generating spinner */}
              {generating && (
                <GlassCard elevation={2} className="fc-glass fc-card p-12 flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[color:var(--fc-aurora)]/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[color:var(--fc-accent)] animate-spin" />
                  </div>
                  <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">Generating your meal plan…</p>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">Selecting templates, filling slots, and balancing macros</p>
                  <p className="text-xs text-[color:var(--fc-text-dim)]">If this takes too long, use Cancel and try again.</p>
                  <Button onClick={cancelGeneration} variant="outline" className="mt-2 fc-btn fc-btn-secondary">
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </GlassCard>
              )}

              {/* Generation error */}
              {!generating && generationError && (
                <GlassCard elevation={2} className="fc-glass fc-card p-6">
                  <div className="flex items-start gap-3 text-[color:var(--fc-status-error)]">
                    <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">Generation Failed</p>
                      <div className="text-sm mt-1 text-[color:var(--fc-text-dim)] space-y-1">
                        {generationError.split("\n").map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button onClick={() => setStep(2)} className="fc-btn fc-btn-secondary">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={runGeneration} className="fc-btn fc-btn-primary">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </GlassCard>
              )}

              {/* Results */}
              {!generating && result && (
                <>
                  {/* Daily summary card */}
                  <GlassCard elevation={2} className="fc-glass fc-card p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                          {result.config.planName || "Generated Plan"}
                        </h2>
                        {/* Raw portions notice */}
                        <p className="text-xs mt-1 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-[color:var(--fc-aurora-green)]/10 text-[color:var(--fc-accent-green)] border border-[color:var(--fc-aurora-green)]/20 font-medium">
                          🥩 All portions are for <strong>raw / uncooked</strong> ingredients
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${deviationBg(result.deviation.caloriesPercent)}`}>
                            {result.withinTolerance ? "✓ Within tolerance" : `⚠ ${Math.round(result.deviation.caloriesPercent)}% off target`}
                          </span>
                          <span className="text-sm text-[color:var(--fc-text-dim)]">
                            {Math.round(result.dailyTotals.calories)} / {result.targets.calories} kcal
                          </span>
                          {/* Fiber total — always visible next to calories */}
                          <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${
                            result.dailyTotals.fiber < 30
                              ? "bg-[color:var(--fc-status-error)]/15 text-[color:var(--fc-status-error)]"
                              : result.dailyTotals.fiber < 40
                              ? "bg-[color:var(--fc-status-warning)]/15 text-[color:var(--fc-status-warning)]"
                              : "bg-[color:var(--fc-status-success)]/15 text-[color:var(--fc-status-success)]"
                          }`}>
                            🌾 {Math.round(result.dailyTotals.fiber)}g / {result.targets.fiber}g fiber
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={runGeneration}
                          className="fc-btn fc-btn-secondary"
                          disabled={generating}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Regenerate
                        </Button>
                        <Button
                          onClick={handleSave}
                          className="fc-btn fc-btn-primary"
                          disabled={saving}
                        >
                          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Save Plan
                        </Button>
                      </div>
                    </div>

                    {/* Macro bars */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <MacroBar label="Protein" value={result.dailyTotals.protein} target={result.targets.protein} />
                      <MacroBar label="Carbs" value={result.dailyTotals.carbs} target={result.targets.carbs} />
                      <MacroBar label="Fat" value={result.dailyTotals.fat} target={result.targets.fat} />
                      <MacroBar label="Fiber" value={result.dailyTotals.fiber} target={result.targets.fiber} />
                    </div>

                    {/* Warnings */}
                    {result.warnings.length > 0 && (
                      <div className="space-y-1.5">
                        {result.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm px-3 py-2 rounded-lg bg-[color:var(--fc-status-warning)]/10 text-[color:var(--fc-status-warning)]">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            {w}
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>

                  {/* Meal cards */}
                  {result.meals.map((meal, mealIdx) => {
                    const isOpen = openMealIdx === mealIdx;
                    const activeTab = activeTabPerMeal[mealIdx] ?? 0;
                    const currentOption = getOption(mealIdx, activeTab);

                    return (
                      <GlassCard key={mealIdx} elevation={2} className="fc-glass fc-card overflow-hidden">
                        {/* Meal header — click to expand */}
                        <button
                          onClick={() => setOpenMealIdx(isOpen ? -1 : mealIdx)}
                          className="w-full flex items-center justify-between p-5 text-left hover:bg-[color:var(--fc-aurora)]/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[color:var(--fc-aurora)]/15 flex items-center justify-center text-[color:var(--fc-accent)]">
                              <span className="text-xs font-bold">{mealIdx + 1}</span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-[color:var(--fc-text-primary)]">{meal.mealName}</h3>
                              <p className="text-xs text-[color:var(--fc-text-dim)]">
                                Target: {meal.perMealTarget.calories} kcal · {meal.perMealTarget.protein}g P / {meal.perMealTarget.carbs}g C / {meal.perMealTarget.fat}g F
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {currentOption && (
                              <span className="text-sm text-[color:var(--fc-text-dim)]">
                                {Math.round(currentOption.totals.calories)} kcal
                              </span>
                            )}
                            {isOpen ? <ChevronUp className="w-4 h-4 text-[color:var(--fc-text-dim)]" /> : <ChevronDown className="w-4 h-4 text-[color:var(--fc-text-dim)]" />}
                          </div>
                        </button>

                        {/* Expanded content */}
                        {isOpen && (
                          <div className="border-t border-[color:var(--fc-glass-border)]">
                            {/* Option tabs */}
                            {meal.options.length > 1 && (
                              <div className="flex border-b border-[color:var(--fc-glass-border)]">
                                {meal.options.map((_, optIdx) => (
                                  <button
                                    key={optIdx}
                                    onClick={() => setActiveTabPerMeal((prev) => ({ ...prev, [mealIdx]: optIdx }))}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                                      activeTab === optIdx
                                        ? "text-[color:var(--fc-accent)] border-b-2 border-[color:var(--fc-accent)]"
                                        : "text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)]"
                                    }`}
                                  >
                                    Option {optIdx + 1}
                                  </button>
                                ))}
                              </div>
                            )}

                            {currentOption && (
                              <div className="p-5 space-y-3">
                                <p className="text-xs text-[color:var(--fc-text-dim)] font-medium uppercase tracking-wide">
                                  {currentOption.templateName}
                                </p>

                                {/* Food table */}
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-[color:var(--fc-glass-border)]">
                                        <th className="text-left py-2 pr-3 text-xs font-semibold text-[color:var(--fc-text-dim)] uppercase tracking-wide">Food</th>
                                        <th className="text-center py-2 px-2 text-xs font-semibold text-[color:var(--fc-text-dim)] uppercase tracking-wide">Portion</th>
                                        <th className="text-right py-2 px-2 text-xs font-semibold text-[color:var(--fc-text-dim)] uppercase tracking-wide">kcal</th>
                                        <th className="text-right py-2 px-2 text-xs font-semibold text-[color:var(--fc-text-dim)] uppercase tracking-wide">P</th>
                                        <th className="text-right py-2 px-2 text-xs font-semibold text-[color:var(--fc-text-dim)] uppercase tracking-wide">C</th>
                                        <th className="text-right py-2 px-2 text-xs font-semibold text-[color:var(--fc-text-dim)] uppercase tracking-wide">F</th>
                                        <th className="py-2 pl-2"></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {currentOption.foods.map((food, foodIdx) => (
                                        <FoodRow
                                          key={`${food.foodId}-${foodIdx}`}
                                          food={food}
                                          onAdjust={(delta) => handleAdjust(mealIdx, activeTab, foodIdx, delta)}
                                          onSwap={() => handleSwap(mealIdx, activeTab, foodIdx)}
                                        />
                                      ))}
                                    </tbody>
                                    {/* Totals row */}
                                    <tfoot>
                                      <tr className="border-t-2 border-[color:var(--fc-glass-border)]">
                                        <td className="py-2 pr-3 text-sm font-bold text-[color:var(--fc-text-primary)]">Totals</td>
                                        <td className="py-2 px-2"></td>
                                        <td className="py-2 px-2 text-right text-sm font-bold text-[color:var(--fc-text-primary)]">{fmt1(currentOption.totals.calories)}</td>
                                        <td className="py-2 px-2 text-right text-sm font-bold text-[color:var(--fc-text-primary)]">{fmt1(currentOption.totals.protein)}</td>
                                        <td className="py-2 px-2 text-right text-sm font-bold text-[color:var(--fc-text-primary)]">{fmt1(currentOption.totals.carbs)}</td>
                                        <td className="py-2 px-2 text-right text-sm font-bold text-[color:var(--fc-text-primary)]">{fmt1(currentOption.totals.fat)}</td>
                                        <td className="py-2 pl-2"></td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>

                                {/* Per-meal deviation */}
                                <div className="flex flex-wrap gap-3 text-xs text-[color:var(--fc-text-dim)] pt-1">
                                  {[
                                    { label: "kcal", actual: currentOption.totals.calories, target: meal.perMealTarget.calories },
                                    { label: "Protein", actual: currentOption.totals.protein, target: meal.perMealTarget.protein },
                                    { label: "Carbs", actual: currentOption.totals.carbs, target: meal.perMealTarget.carbs },
                                    { label: "Fat", actual: currentOption.totals.fat, target: meal.perMealTarget.fat },
                                    { label: "Fiber", actual: currentOption.totals.fiber, target: meal.perMealTarget.fiber },
                                  ].map(({ label, actual, target }) => {
                                    const dev = target > 0 ? Math.abs((actual - target) / target) * 100 : 0;
                                    return (
                                      <span key={label} className={`px-2 py-0.5 rounded-full ${deviationBg(dev)}`}>
                                        {label}: {Math.round(actual)}{label === "kcal" ? "" : "g"}/{target}{label === "kcal" ? "" : "g"}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </GlassCard>
                    );
                  })}

                  {/* Bottom action bar */}
                  <GlassCard elevation={2} className="fc-glass fc-card p-5 flex flex-wrap items-center justify-between gap-3">
                    <Button onClick={() => setStep(2)} className="fc-btn fc-btn-secondary">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Rules
                    </Button>
                    <div className="flex gap-2">
                      <Button onClick={runGeneration} className="fc-btn fc-btn-secondary" disabled={generating}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate
                      </Button>
                      <Button onClick={handleSave} className="fc-btn fc-btn-primary" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Plan
                      </Button>
                    </div>
                  </GlassCard>
                </>
              )}
            </div>
          )}
        </div>

        {/* ================================================================
            SWAP MODAL
        ================================================================ */}
        {swapModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <GlassCard elevation={3} className="fc-glass fc-card w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-[color:var(--fc-glass-border)]">
                <div>
                  <h3 className="font-semibold text-[color:var(--fc-text-primary)]">Swap Food</h3>
                  <p className="text-xs text-[color:var(--fc-text-dim)] mt-0.5">
                    Replacing: <span className="text-[color:var(--fc-text-primary)]">{swapModal.currentFood.foodName}</span>
                    {" · "}slot type: <span className="text-[color:var(--fc-accent)]">{swapModal.slotType}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSwapModal(null)}
                  className="p-1.5 rounded-lg text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)] hover:bg-[color:var(--fc-aurora)]/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-5 space-y-2">
                {getSwapAlternatives(swapModal.slotType, swapModal.currentFood.foodId, foodsBySlot).map((alt) => {
                  const previewMacros = { calories: alt.calories_per_100g * swapModal.currentFood.portionGrams / 100, protein: alt.protein_per_100g * swapModal.currentFood.portionGrams / 100, carbs: alt.carbs_per_100g * swapModal.currentFood.portionGrams / 100, fat: alt.fat_per_100g * swapModal.currentFood.portionGrams / 100 };
                  return (
                    <button
                      key={alt.id}
                      onClick={() => handleSwapConfirm(alt)}
                      className="w-full text-left p-3 rounded-xl fc-surface border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-accent)] hover:bg-[color:var(--fc-aurora)]/5 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-[color:var(--fc-text-primary)]">{alt.name}</p>
                          {alt.is_common && (
                            <span className="text-xs text-[color:var(--fc-accent)] font-medium">★ Common</span>
                          )}
                        </div>
                        <div className="text-right text-xs text-[color:var(--fc-text-dim)] shrink-0">
                          <p>{Math.round(previewMacros.calories)} kcal</p>
                          <p>{Math.round(previewMacros.protein)}g P / {Math.round(previewMacros.carbs)}g C / {Math.round(previewMacros.fat)}g F</p>
                          <p className="text-[10px] mt-0.5">at {swapModal.currentFood.portionGrams}g</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {getSwapAlternatives(swapModal.slotType, swapModal.currentFood.foodId, foodsBySlot).length === 0 && (
                  <p className="text-sm text-[color:var(--fc-text-dim)] text-center py-4">No alternatives found for this slot type.</p>
                )}
              </div>
            </GlassCard>
          </div>
        )}
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
