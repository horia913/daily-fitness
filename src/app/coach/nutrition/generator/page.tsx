"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { useAuth } from "@/contexts/AuthContext";
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
  type GeneratedOption,
  type GeneratedFood,
  type FoodRecord,
} from "@/lib/mealPlanGeneratorService";
import { fetchApi } from "@/lib/apiClient";
import { PlanMacroStrip, hueBadgeClass, hueOptClass } from "@/components/meal-display/PlanMacroStrip";
import { mealTypeBadge, optionHueIndex } from "@/components/meal-display/mealDisplayUtils";
import mealStyles from "@/components/meal-display/mealDisplay.module.css";
import wsStyles from "@/components/coach/nutrition/coachNutritionWorkspace.module.css";
import gen from "./generator.module.css";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Save,
  ArrowLeftRight,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Search,
  Beef,
  Wheat,
  Star,
} from "lucide-react";

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

const STEP_LABELS = ["Targets", "Food Rules", "Review"] as const;

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
  ],
  snack: [
    { value: "", label: "No preference" },
    { value: "smoothie", label: "Smoothie" },
    { value: "yogurt_bowl", label: "Yogurt bowl" },
    { value: "fruit_protein", label: "Fruit + protein" },
    { value: "quick_snack", label: "Quick snack" },
  ],
};

function fmt1(n: number) {
  return Math.round(n * 10) / 10;
}

function deviationBg(pct: number) {
  if (pct <= 7) return `${gen.devPill} ${mealStyles.pillGood}`;
  if (pct <= 15)
    return `${gen.devPill} bg-[color-mix(in_srgb,var(--fc-status-warning)_15%,transparent)] text-[color:var(--fc-status-warning)]`;
  return `${gen.devPill} bg-[color-mix(in_srgb,var(--fc-status-error)_15%,transparent)] text-[color:var(--fc-status-error)]`;
}

function Stepper({ step }: { step: Step }) {
  return (
    <nav className={gen.stepper} aria-label="Generator steps">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step;
        const isActive = step === n;
        const isDone = step > n;
        const labelClass = isActive
          ? gen.stepActive
          : isDone
            ? gen.stepDone
            : gen.stepPending;
        return (
          <React.Fragment key={label}>
            <div className={gen.stepItem}>
              <span className={`${gen.stepLabel} ${labelClass}`}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 ? <div className={gen.stepRail} aria-hidden /> : null}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

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

  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (!sessionReady) return;
    updatePosition();
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("foods")
          .select("id, name")
          .ilike("name", `%${q}%`)
          .limit(10);
        setResults((data ?? []) as FoodSearchResult[]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleFocus = () => {
    if (results.length > 0) {
      updatePosition();
      setOpen(true);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 150);
  };

  const dropdown =
    open && mounted
      ? ReactDOM.createPortal(
          <div className={gen.dropdownShell} style={dropdownStyle}>
            {results.length > 0 ? (
              results.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(f);
                    setQuery("");
                    setResults([]);
                    setOpen(false);
                  }}
                  className={gen.dropdownItem}
                >
                  {f.name}
                </button>
              ))
            ) : (
              <div className={gen.dropdownEmpty}>
                No foods found for &ldquo;{query}&rdquo;
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={gen.underlineField}>
      <Search className="w-4 h-4 shrink-0 text-[color:var(--fc-text-subtle)]" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={!sessionReady}
        placeholder={sessionReady ? placeholder : "Loading…"}
        className={gen.underlineInput}
      />
      {loading ? (
        <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[color:var(--fc-text-dim)]" />
      ) : null}
      {dropdown}
    </div>
  );
}

function GeneratorFoodRow({
  food,
  onAdjust,
  onSwap,
}: {
  food: GeneratedFood;
  onAdjust: (delta: number) => void;
  onSwap: () => void;
}) {
  return (
    <div className={mealStyles.food}>
      <span className={mealStyles.fn}>
        {food.foodName}
        <span className={mealStyles.fq}>{food.slotName}</span>
        <span className={gen.foodActions}>
          <button type="button" className={gen.portionBtn} onClick={() => onAdjust(-5)} aria-label="Decrease portion">
            <Minus className="w-3 h-3" />
          </button>
          <span className={mealStyles.fq}>{food.portionGrams}g</span>
          <button type="button" className={gen.portionBtn} onClick={() => onAdjust(5)} aria-label="Increase portion">
            <Plus className="w-3 h-3" />
          </button>
          <button type="button" className={gen.swapBtn} onClick={onSwap} title="Swap this food">
            <ArrowLeftRight className="w-3 h-3" />
          </button>
        </span>
      </span>
      <span className={mealStyles.fm}>
        {fmt1(food.calories)} kcal · {fmt1(food.protein)}P · {fmt1(food.carbs)}C · {fmt1(food.fat)}F
      </span>
    </div>
  );
}

export default function GeneratorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [step, setStep] = useState<Step>(1);

  const [planName, setPlanName] = useState("");
  const [targetKcal, setTargetKcal] = useState<number>(2000);
  const [macroMode, setMacroMode] = useState<"auto" | "manual">("auto");
  const [manualProtein, setManualProtein] = useState<number>(0);
  const [manualCarbs, setManualCarbs] = useState<number>(0);
  const [manualFat, setManualFat] = useState<number>(0);
  const [manualFiber, setManualFiber] = useState<number>(25);
  const [mealCount, setMealCount] = useState<number>(4);
  const [optionsPerMeal, setOptionsPerMeal] = useState<number>(3);

  const computed = autoMacros(targetKcal);
  const manualKcalSum = manualProtein * 4 + manualCarbs * 4 + manualFat * 9;
  const manualMatchesTarget = Math.abs(manualKcalSum - targetKcal) <= 50;

  useEffect(() => {
    if (macroMode === "manual") {
      setManualProtein(computed.protein);
      setManualCarbs(computed.carbs);
      setManualFat(computed.fat);
      setManualFiber(computed.fiber);
    }
  }, [macroMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const [presets, setPresets] = useState<RestrictionPreset[]>([]);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [excludedFoods, setExcludedFoods] = useState<FoodSearchResult[]>([]);
  const [requiredFoods, setRequiredFoods] = useState<FoodSearchResult[]>([]);
  const [breakfastStyle, setBreakfastStyle] = useState<string>("");
  const [lunchStyle, setLunchStyle] = useState<string>("");
  const [dinnerStyle, setDinnerStyle] = useState<string>("");
  const [snackStyle, setSnackStyle] = useState<string>("");
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(() => {
      if (!cancelled) setSessionReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    let cancelled = false;
    supabase
      .from("restriction_presets")
      .select("*")
      .order("display_name")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to load restriction presets:", error.message);
          return;
        }
        if (data) setPresets(data as RestrictionPreset[]);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionReady]);

  const excludedTags = Array.from(
    new Set(
      presets.filter((p) => selectedPresets.has(p.name)).flatMap((p) => p.excluded_tags),
    ),
  );

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [foodsBySlot, setFoodsBySlot] = useState<Map<string, FoodRecord[]>>(new Map());
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [openMealIdx, setOpenMealIdx] = useState<number>(0);
  const [activeTabPerMeal, setActiveTabPerMeal] = useState<Record<number, number>>({});
  const [localOptions, setLocalOptions] = useState<Record<string, GeneratedOption>>({});
  const [swapModal, setSwapModal] = useState<SwapModalState | null>(null);
  const [saving, setSaving] = useState(false);

  const GENERATION_TIMEOUT_MS = 60000;
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
      const res = await fetchApi("/api/coach/nutrition/generate", {
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
          : (data?.error ?? res.statusText ?? "Generation failed.");
        setGenerationError(msg);
        return;
      }
      setResult(data.result);
      setFoodsBySlot(
        data.foodsBySlot && typeof data.foodsBySlot === "object"
          ? new Map(Object.entries(data.foodsBySlot) as [string, FoodRecord[]][])
          : new Map(),
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

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        <CoachPageShell widthVariant="canvas-full" className="!p-0">
          <div className={gen.page}>
            <header className={gen.headerRow}>
              <div className="min-w-0">
                <Link href="/coach/nutrition" className={mealStyles.back}>
                  ‹ Nutrition
                </Link>
                <h1 className={mealStyles.h1} style={{ marginTop: 10 }}>
                  Meal plan generator
                </h1>
              </div>
            </header>

            <Stepper step={step} />

            {step === 1 && (
              <div className={gen.formCanvas}>
                <section className={gen.section}>
                  <div className={gen.sectionHead}>
                    <h2 className={gen.sectionTitle}>Targets</h2>
                  </div>

                  <div className={gen.configBand}>
                    <div className={`${gen.field} ${gen.planNameField}`}>
                      <label className={gen.fieldLabel} htmlFor="plan-name">
                        Plan name
                      </label>
                      <div className={gen.underlineField}>
                        <input
                          id="plan-name"
                          type="text"
                          value={planName}
                          onChange={(e) => setPlanName(e.target.value)}
                          placeholder="e.g. John's 2000 kcal bulk plan"
                          className={gen.underlineInput}
                        />
                      </div>
                    </div>

                    <div className={gen.field}>
                      <label className={gen.fieldLabel} htmlFor="target-kcal">
                        Daily calories (kcal) *
                      </label>
                      <div className={gen.underlineField}>
                        <input
                          id="target-kcal"
                          type="number"
                          min={800}
                          max={6000}
                          value={targetKcal}
                          onChange={(e) => setTargetKcal(Number(e.target.value))}
                          className={gen.underlineInput}
                        />
                      </div>
                    </div>

                    <div className={gen.field}>
                      <label className={gen.fieldLabel} htmlFor="meal-count">
                        Meals / day
                      </label>
                      <select
                        id="meal-count"
                        value={mealCount}
                        onChange={(e) => setMealCount(Number(e.target.value))}
                        className={gen.underlineSelect}
                      >
                        {[3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n} meals
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={gen.field}>
                      <label className={gen.fieldLabel} htmlFor="options-count">
                        Options / meal
                      </label>
                      <select
                        id="options-count"
                        value={optionsPerMeal}
                        onChange={(e) => setOptionsPerMeal(Number(e.target.value))}
                        className={gen.underlineSelect}
                      >
                        {[1, 2, 3].map((n) => (
                          <option key={n} value={n}>
                            {n} option{n > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={`${gen.macroBand} ${gen.field}`}>
                    <span className={gen.fieldLabel}>Macros</span>
                    <div className={`${gen.chipRow} mb-3`}>
                      {(["auto", "manual"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setMacroMode(mode)}
                          className={`${wsStyles.chip} ${macroMode === mode ? wsStyles.chipOn : wsStyles.chipOff}`}
                        >
                          {mode === "auto" ? "Auto-calculate" : "Manual"}
                        </button>
                      ))}
                    </div>

                    {macroMode === "auto" ? (
                      <p className={gen.macroLine}>
                        <b>{computed.protein}g</b> protein
                        <span className={mealStyles.sep}> · </span>
                        <b>{computed.carbs}g</b> carbs
                        <span className={mealStyles.sep}> · </span>
                        <b>{computed.fat}g</b> fat
                        <span className={mealStyles.sep}> · </span>
                        <b>{computed.fiber}g</b> fiber
                      </p>
                    ) : (
                      <>
                        <div className={gen.manualMacroGrid}>
                          {[
                            { label: "Protein (g)", value: manualProtein, set: setManualProtein, id: "mp" },
                            { label: "Carbs (g)", value: manualCarbs, set: setManualCarbs, id: "mc" },
                            { label: "Fat (g)", value: manualFat, set: setManualFat, id: "mf" },
                            { label: "Fiber (g)", value: manualFiber, set: setManualFiber, id: "mfi" },
                          ].map(({ label, value, set, id }) => (
                            <div key={id} className={gen.field}>
                              <label className={gen.fieldLabel} htmlFor={id}>
                                {label}
                              </label>
                              <div className={gen.underlineField}>
                                <input
                                  id={id}
                                  type="number"
                                  min={0}
                                  value={value}
                                  onChange={(e) => set(Number(e.target.value))}
                                  className={gen.underlineInput}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div
                          className={`${gen.validationBanner} ${manualMatchesTarget ? gen.validationOk : gen.validationWarn}`}
                        >
                          {manualMatchesTarget ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                          )}
                          <span>
                            {manualProtein * 4 + manualCarbs * 4 + manualFat * 9} kcal from macros
                            {!manualMatchesTarget &&
                              ` (target: ${targetKcal} kcal — ${Math.abs(manualKcalSum - targetKcal)} kcal difference)`}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                <div className={`${gen.actionRow} ${gen.actionRowEnd}`}>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!targetKcal || targetKcal < 800}
                    className={wsStyles.primaryCta}
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className={gen.formCanvas}>
                <section className={gen.section}>
                  <div className={gen.sectionHead}>
                    <h2 className={gen.sectionTitle}>Dietary restrictions</h2>
                    <p className={gen.sectionHint}>
                      Tick any that apply — matching foods are removed from every option
                    </p>
                  </div>
                  {!sessionReady || presets.length === 0 ? (
                    <div className={gen.loadingRow}>
                      <Loader2 className="w-4 h-4 animate-spin text-[color:var(--fc-text-dim)]" />
                      <span className={gen.loadingText}>Loading restrictions…</span>
                    </div>
                  ) : (
                    <div className={gen.presetGrid}>
                      {presets.map((p) => {
                        const checked = selectedPresets.has(p.name);
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              const next = new Set(selectedPresets);
                              if (checked) next.delete(p.name);
                              else next.add(p.name);
                              setSelectedPresets(next);
                            }}
                            className={`${wsStyles.chip} ${checked ? wsStyles.chipOn : wsStyles.chipOff}`}
                          >
                            {p.display_name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {excludedTags.length > 0 ? (
                    <div className={`${gen.foodChipRow} mt-3`}>
                      <span className={gen.fieldLabel} style={{ margin: 0 }}>
                        Excluding tags
                      </span>
                      {excludedTags.map((tag) => (
                        <span key={tag} className={gen.tagChip}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className={gen.section}>
                  <div className={gen.sectionHead}>
                    <h2 className={gen.sectionTitle}>Meal styles</h2>
                    <p className={gen.sectionHint}>Optional — leave as no preference for variety</p>
                  </div>
                  <div className={gen.styleGrid}>
                    {(
                      [
                        ["Breakfast", breakfastStyle, setBreakfastStyle, "breakfast"],
                        ["Lunch", lunchStyle, setLunchStyle, "lunch"],
                        ["Dinner", dinnerStyle, setDinnerStyle, "dinner"],
                        ...(mealCount >= 4
                          ? [["Snack", snackStyle, setSnackStyle, "snack"] as const]
                          : []),
                      ] as const
                    ).map(([label, value, setter, key]) => (
                      <div key={key} className={gen.field}>
                        <label className={gen.fieldLabel}>{label}</label>
                        <select
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          className={gen.underlineSelect}
                        >
                          {MEAL_STYLE_OPTIONS[key].map((o) => (
                            <option key={o.value || "_none"} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </section>

                <section className={gen.section}>
                  <div className={gen.foodSearchCols}>
                    <div className={gen.foodSearchCol}>
                      <div className={gen.sectionHead}>
                        <h2 className={gen.sectionTitle}>Exclude specific foods</h2>
                        <p className={gen.sectionHint}>Search and ban individual foods from the plan</p>
                      </div>
                      <FoodSearchBox
                        placeholder='Type a food name, e.g. "Salmon"…'
                        sessionReady={sessionReady}
                        onSelect={(f) => {
                          if (!excludedFoods.find((e) => e.id === f.id))
                            setExcludedFoods((prev) => [...prev, f]);
                        }}
                      />
                      {excludedFoods.length > 0 ? (
                        <div className={gen.foodChipRow}>
                          {excludedFoods.map((f) => (
                            <span key={f.id} className={`${gen.foodChip} ${gen.foodChipError}`}>
                              {f.name}
                              <button
                                type="button"
                                className={gen.chipRemove}
                                onClick={() => setExcludedFoods((prev) => prev.filter((e) => e.id !== f.id))}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className={gen.foodSearchCol}>
                      <div className={gen.sectionHead}>
                        <h2 className={gen.sectionTitle}>Required foods</h2>
                        <p className={gen.sectionHint}>Pin foods the generator should prefer wherever possible</p>
                      </div>
                      <FoodSearchBox
                        placeholder='Type a food name, e.g. "Chicken breast"…'
                        sessionReady={sessionReady}
                        onSelect={(f) => {
                          if (!requiredFoods.find((r) => r.id === f.id))
                            setRequiredFoods((prev) => [...prev, f]);
                        }}
                      />
                      {requiredFoods.length > 0 ? (
                        <div className={gen.foodChipRow}>
                          {requiredFoods.map((f) => (
                            <span key={f.id} className={`${gen.foodChip} ${gen.foodChipSuccess}`}>
                              {f.name}
                              <button
                                type="button"
                                className={gen.chipRemove}
                                onClick={() => setRequiredFoods((prev) => prev.filter((r) => r.id !== f.id))}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>

                <div className={gen.actionRow}>
                  <button type="button" onClick={() => setStep(1)} className={wsStyles.ghostBtn}>
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button type="button" onClick={handleGoToReview} className={wsStyles.primaryCta}>
                    <Sparkles className="w-4 h-4" />
                    Generate plan
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className={gen.formCanvas}>
                {generating ? (
                  <div className={gen.loadingRow}>
                    <Loader2 className="w-5 h-5 animate-spin text-[color:var(--fc-accent)]" />
                    <div>
                      <p className={gen.loadingText}>Generating your meal plan…</p>
                      <p className={gen.loadingSub}>
                        Selecting templates, filling slots, and balancing macros
                      </p>
                    </div>
                    <button type="button" onClick={cancelGeneration} className={wsStyles.ghostBtn} style={{ marginLeft: "auto" }}>
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                ) : null}

                {!generating && generationError ? (
                  <div className={gen.errorBlock}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-[color:var(--fc-status-error)]" />
                      <div className="flex-1 min-w-0">
                        <h3 className={gen.errorTitle}>Generation failed</h3>
                        {generationError.split("\n").map((line, i) => (
                          <p key={i} className={gen.errorLine}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className={`${gen.actionRow} mt-4`} style={{ borderTop: "none", paddingTop: 0 }}>
                      <button type="button" onClick={() => setStep(2)} className={wsStyles.ghostBtn}>
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button type="button" onClick={runGeneration} className={wsStyles.ghostBtn}>
                        <RefreshCw className="w-4 h-4" />
                        Retry
                      </button>
                    </div>
                  </div>
                ) : null}

                {!generating && result ? (
                  <>
                    <div className={gen.reviewHeader}>
                      <div className="min-w-0">
                        <h2 className={gen.reviewTitle}>{result.config.planName || "Generated plan"}</h2>
                        <div className={gen.metaRow}>
                          <span className={`${mealStyles.pill} ${mealStyles.pillMute}`}>
                            <Beef className="w-3 h-3" />
                            Raw / uncooked portions
                          </span>
                          <span
                            className={`${mealStyles.pill} ${
                              result.withinTolerance ? mealStyles.pillGood : mealStyles.pillMute
                            }`}
                          >
                            {result.withinTolerance ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Within tolerance
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3" />
                                {Math.round(result.deviation.caloriesPercent)}% off target
                              </>
                            )}
                          </span>
                          <span
                            className={`${mealStyles.pill} ${
                              result.dailyTotals.fiber < 30
                                ? "bg-[color-mix(in_srgb,var(--fc-status-error)_15%,transparent)] text-[color:var(--fc-status-error)]"
                                : result.dailyTotals.fiber < 40
                                  ? "bg-[color-mix(in_srgb,var(--fc-status-warning)_15%,transparent)] text-[color:var(--fc-status-warning)]"
                                  : mealStyles.pillGood
                            }`}
                          >
                            <Wheat className="w-3 h-3" />
                            {Math.round(result.dailyTotals.fiber)}g / {result.targets.fiber}g fiber
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={runGeneration}
                          disabled={generating}
                          className={wsStyles.ghostBtn}
                        >
                          <RefreshCw className="w-4 h-4" />
                          Regenerate
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving} className={wsStyles.ghostBtn}>
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save plan
                        </button>
                      </div>
                    </div>

                    <PlanMacroStrip
                      computed={{
                        calories: result.dailyTotals.calories,
                        protein: result.dailyTotals.protein,
                        carbs: result.dailyTotals.carbs,
                        fat: result.dailyTotals.fat,
                        fiber: result.dailyTotals.fiber,
                      }}
                      targets={{
                        target_calories: result.targets.calories,
                        target_protein: result.targets.protein,
                        target_carbs: result.targets.carbs,
                        target_fat: result.targets.fat,
                      }}
                    />

                    {result.warnings.map((w, i) => (
                      <div key={i} className={gen.warningRow}>
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {w}
                      </div>
                    ))}

                    <div className={mealStyles.mlist}>
                      {result.meals.map((meal, mealIdx) => {
                        const isOpen = openMealIdx === mealIdx;
                        const activeTab = activeTabPerMeal[mealIdx] ?? 0;
                        const currentOption = getOption(mealIdx, activeTab);
                        const typeBadge = mealTypeBadge(meal.mealType);

                        return (
                          <div
                            key={mealIdx}
                            className={`${mealStyles.mrow} ${isOpen ? mealStyles.mrowOpen : ""}`}
                          >
                            <button
                              type="button"
                              className={mealStyles.mhead}
                              onClick={() => setOpenMealIdx(isOpen ? -1 : mealIdx)}
                            >
                              <span className={`${mealStyles.badge} ${hueBadgeClass(typeBadge.hue)}`}>
                                {typeBadge.letter}
                              </span>
                              <span className={mealStyles.mb}>
                                <span className={mealStyles.mname}>{meal.mealName}</span>
                                <span className={mealStyles.mrx}>
                                  Target{" "}
                                  <b>
                                    {meal.perMealTarget.calories} kcal · {meal.perMealTarget.protein}g P ·{" "}
                                    {meal.perMealTarget.carbs}g C · {meal.perMealTarget.fat}g F
                                  </b>
                                  {currentOption ? (
                                    <>
                                      <span className={mealStyles.sep}> · </span>
                                      {Math.round(currentOption.totals.calories)} kcal computed
                                    </>
                                  ) : null}
                                </span>
                              </span>
                              <span className={mealStyles.chev} aria-hidden>
                                ›
                              </span>
                            </button>

                            <div className={mealStyles.mbody}>
                              <div className={mealStyles.minner}>
                                {meal.options.length > 1 ? (
                                  <div className={gen.optionChipRow}>
                                    {meal.options.map((_, optIdx) => (
                                      <button
                                        key={optIdx}
                                        type="button"
                                        onClick={() =>
                                          setActiveTabPerMeal((prev) => ({ ...prev, [mealIdx]: optIdx }))
                                        }
                                        className={`${wsStyles.chip} ${activeTab === optIdx ? wsStyles.chipOn : wsStyles.chipOff}`}
                                      >
                                        Option {optIdx + 1}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}

                                {currentOption ? (
                                  <div
                                    className={`${mealStyles.opt} ${hueOptClass(optionHueIndex(activeTab))}`}
                                  >
                                    <div className={mealStyles.ohead}>
                                      <span
                                        className={`${mealStyles.badge} ${hueBadgeClass(optionHueIndex(activeTab))}`}
                                      >
                                        {String.fromCharCode(65 + activeTab)}
                                      </span>
                                      <span className={mealStyles.ometa}>
                                        <b>{currentOption.templateName}</b>
                                      </span>
                                    </div>

                                    {currentOption.foods.map((food, foodIdx) => (
                                      <GeneratorFoodRow
                                        key={`${food.foodId}-${foodIdx}`}
                                        food={food}
                                        onAdjust={(delta) => handleAdjust(mealIdx, activeTab, foodIdx, delta)}
                                        onSwap={() => handleSwap(mealIdx, activeTab, foodIdx)}
                                      />
                                    ))}

                                    <div className={gen.totalsRow}>
                                      <span>Totals</span>
                                      <span>
                                        {fmt1(currentOption.totals.calories)} kcal · {fmt1(currentOption.totals.protein)}P ·{" "}
                                        {fmt1(currentOption.totals.carbs)}C · {fmt1(currentOption.totals.fat)}F
                                      </span>
                                    </div>

                                    <div className={gen.deviationRow}>
                                      {[
                                        { label: "kcal", actual: currentOption.totals.calories, target: meal.perMealTarget.calories },
                                        { label: "protein", actual: currentOption.totals.protein, target: meal.perMealTarget.protein },
                                        { label: "carbs", actual: currentOption.totals.carbs, target: meal.perMealTarget.carbs },
                                        { label: "fat", actual: currentOption.totals.fat, target: meal.perMealTarget.fat },
                                        { label: "fiber", actual: currentOption.totals.fiber, target: meal.perMealTarget.fiber },
                                      ].map(({ label, actual, target }) => {
                                        const dev = target > 0 ? Math.abs((actual - target) / target) * 100 : 0;
                                        return (
                                          <span key={label} className={deviationBg(dev)}>
                                            {label}: {Math.round(actual)}
                                            {label === "kcal" ? "" : "g"}/{target}
                                            {label === "kcal" ? "" : "g"}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className={gen.actionRow}>
                      <button type="button" onClick={() => setStep(2)} className={wsStyles.ghostBtn}>
                        <ArrowLeft className="w-4 h-4" />
                        Back to rules
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={runGeneration}
                          disabled={generating}
                          className={wsStyles.ghostBtn}
                        >
                          <RefreshCw className="w-4 h-4" />
                          Regenerate
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving} className={wsStyles.primaryCta}>
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save plan
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {swapModal ? (
            <div className={gen.modalScrim} role="dialog" aria-modal="true">
              <div className={gen.modalPanel}>
                <div className={gen.modalHead}>
                  <div>
                    <h3 className={gen.modalTitle}>Swap food</h3>
                    <p className={gen.modalSub}>
                      Replacing {swapModal.currentFood.foodName} · slot {swapModal.slotType}
                    </p>
                  </div>
                  <button type="button" onClick={() => setSwapModal(null)} className={gen.modalClose}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className={gen.modalBody}>
                  {getSwapAlternatives(
                    swapModal.slotType,
                    swapModal.currentFood.foodId,
                    foodsBySlot,
                  ).map((alt) => {
                    const previewMacros = {
                      calories: (alt.calories_per_100g * swapModal.currentFood.portionGrams) / 100,
                      protein: (alt.protein_per_100g * swapModal.currentFood.portionGrams) / 100,
                      carbs: (alt.carbs_per_100g * swapModal.currentFood.portionGrams) / 100,
                      fat: (alt.fat_per_100g * swapModal.currentFood.portionGrams) / 100,
                    };
                    return (
                      <button
                        key={alt.id}
                        type="button"
                        onClick={() => handleSwapConfirm(alt)}
                        className={gen.swapOption}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={gen.swapName}>{alt.name}</p>
                            {alt.is_common ? (
                              <span className={gen.commonTag}>
                                <Star className="w-3 h-3" />
                                Common
                              </span>
                            ) : null}
                          </div>
                          <div className={gen.swapMeta}>
                            <p>{Math.round(previewMacros.calories)} kcal</p>
                            <p>
                              {Math.round(previewMacros.protein)}g P / {Math.round(previewMacros.carbs)}g C /{" "}
                              {Math.round(previewMacros.fat)}g F
                            </p>
                            <p>at {swapModal.currentFood.portionGrams}g</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {getSwapAlternatives(
                    swapModal.slotType,
                    swapModal.currentFood.foodId,
                    foodsBySlot,
                  ).length === 0 ? (
                    <p className={gen.dropdownEmpty}>No alternatives found for this slot type.</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
