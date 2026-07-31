"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Food } from "@/lib/mealPlanService";
import type {
  MealPlanDraftState,
  MealPlanSaveUiState,
  MealTypeValue,
} from "@/types/mealPlanDraft";
import { commitMealPlanTree } from "@/lib/mealPlans/commitMealPlanTree";
import { loadMealPlanDraftBaseline } from "@/lib/mealPlans/loadMealPlanDraftBaseline";
import {
  addFoodToDraft,
  addMealToDraft,
  addOptionToDraft,
  removeFoodFromDraft,
  removeMealFromDraft,
  removeOptionFromDraft,
  updateFoodQuantityInDraft,
  updateMealInDraft,
  updateOptionInDraft,
  MAX_OPTIONS_PER_MEAL,
} from "@/lib/mealPlans/mealPlanDraftMutations";
import {
  clearStoredMealPlanDraft,
  readStoredMealPlanDraft,
  storedMealPlanDraftDiffersFromBaseline,
  writeStoredMealPlanDraft,
} from "@/lib/mealPlans/mealPlanDraftStorage";
import {
  cloneMealPlanDraft,
  hasUnsavedMealPlanChanges,
  recomputeDraftState,
} from "@/lib/mealPlans/mealPlanDraftUtils";

const STORAGE_DEBOUNCE_MS = 500;

interface MealPlanDraftContextValue {
  loading: boolean;
  baseline: MealPlanDraftState | null;
  workingCopy: MealPlanDraftState | null;
  saveState: MealPlanSaveUiState;
  saveError: string | null;
  resumePrompt: { savedAt: string } | null;
  isDirty: boolean;
  acceptResume: () => void;
  discardStoredDraft: () => void;
  discardToBaseline: () => void;
  commit: () => Promise<boolean>;
  addMeal: () => string | null;
  removeMeal: (mealId: string) => void;
  updateMeal: (mealId: string, patch: Partial<{ name: string; mealType: MealTypeValue }>) => void;
  addOption: (mealId: string) => void;
  removeOption: (mealId: string, optionId: string) => boolean;
  updateOption: (mealId: string, optionId: string, patch: Partial<{ name: string }>) => void;
  addFood: (mealId: string, optionId: string, food: Food) => void;
  removeFood: (mealId: string, optionId: string, foodItemId: string) => void;
  updateFoodQuantity: (mealId: string, optionId: string, foodItemId: string, quantity: number) => void;
  maxOptionsPerMeal: number;
}

const MealPlanDraftContext = createContext<MealPlanDraftContextValue | null>(null);

export function useMealPlanDraft(): MealPlanDraftContextValue {
  const ctx = useContext(MealPlanDraftContext);
  if (!ctx) throw new Error("useMealPlanDraft must be used within MealPlanDraftProvider");
  return ctx;
}

interface MealPlanDraftProviderProps {
  mealPlanId: string;
  coachId: string;
  children: ReactNode;
}

export function MealPlanDraftProvider({
  mealPlanId,
  coachId,
  children,
}: MealPlanDraftProviderProps) {
  const [loading, setLoading] = useState(true);
  const [baseline, setBaseline] = useState<MealPlanDraftState | null>(null);
  const [workingCopy, setWorkingCopyState] = useState<MealPlanDraftState | null>(null);
  const [saveState, setSaveState] = useState<MealPlanSaveUiState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [resumePrompt, setResumePrompt] = useState<{ savedAt: string } | null>(null);
  const storageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitInFlightRef = useRef(false);

  const setWorkingCopy = useCallback(
    (next: MealPlanDraftState) => {
      const recomputed = recomputeDraftState(next);
      setWorkingCopyState(recomputed);
      const dirty = baseline ? hasUnsavedMealPlanChanges(recomputed, baseline) : false;
      setSaveState(dirty ? "dirty" : "idle");
      setSaveError(null);
      if (storageTimer.current) clearTimeout(storageTimer.current);
      storageTimer.current = setTimeout(() => {
        writeStoredMealPlanDraft(coachId, mealPlanId, recomputed);
      }, STORAGE_DEBOUNCE_MS);
    },
    [baseline, coachId, mealPlanId],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const draft = await loadMealPlanDraftBaseline(mealPlanId);
      const base = recomputeDraftState(draft);
      setBaseline(cloneMealPlanDraft(base));

      const stored = readStoredMealPlanDraft(coachId, mealPlanId);
      if (stored && storedMealPlanDraftDiffersFromBaseline(stored, base)) {
        setResumePrompt({ savedAt: stored.savedAt });
        setWorkingCopyState(cloneMealPlanDraft(base));
      } else {
        setWorkingCopyState(cloneMealPlanDraft(base));
      }
      setSaveState("idle");
      setSaveError(null);
    } catch (e) {
      console.error("Error loading meal plan draft:", e);
      setBaseline(null);
      setWorkingCopyState(null);
    } finally {
      setLoading(false);
    }
  }, [coachId, mealPlanId]);

  useEffect(() => {
    void loadInitial();
    return () => {
      if (storageTimer.current) clearTimeout(storageTimer.current);
      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);
    };
  }, [loadInitial]);

  const acceptResume = useCallback(() => {
    const stored = readStoredMealPlanDraft(coachId, mealPlanId);
    if (stored?.workingCopy) {
      setWorkingCopyState(recomputeDraftState(cloneMealPlanDraft(stored.workingCopy)));
      setSaveState(
        baseline && hasUnsavedMealPlanChanges(stored.workingCopy, baseline) ? "dirty" : "idle",
      );
    }
    setResumePrompt(null);
  }, [baseline, coachId, mealPlanId]);

  const discardStoredDraft = useCallback(() => {
    clearStoredMealPlanDraft(coachId, mealPlanId);
    if (baseline) {
      setWorkingCopyState(cloneMealPlanDraft(baseline));
      setSaveState("idle");
      setSaveError(null);
    }
    setResumePrompt(null);
  }, [baseline, coachId, mealPlanId]);

  const discardToBaseline = useCallback(() => {
    clearStoredMealPlanDraft(coachId, mealPlanId);
    if (baseline) {
      setWorkingCopyState(cloneMealPlanDraft(baseline));
      setSaveState("idle");
      setSaveError(null);
    }
  }, [baseline, coachId, mealPlanId]);

  const commit = useCallback(async (): Promise<boolean> => {
    if (commitInFlightRef.current || !workingCopy || !baseline) return false;
    commitInFlightRef.current = true;
    setSaveState("saving");
    setSaveError(null);

    try {
      const result = await commitMealPlanTree(baseline, workingCopy);
      if (!result.success || !result.state) {
        if (result.state) {
          setWorkingCopyState(recomputeDraftState(result.state));
        }
        setSaveState("error");
        setSaveError(result.error ?? "Save failed");
        return false;
      }
      const committed = cloneMealPlanDraft(result.state);
      setBaseline(committed);
      setWorkingCopyState(committed);
      clearStoredMealPlanDraft(coachId, mealPlanId);
      setSaveState("saved");
      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current);
      savedFadeTimer.current = setTimeout(() => setSaveState("idle"), 2000);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setSaveState("error");
      setSaveError(message);
      return false;
    } finally {
      commitInFlightRef.current = false;
    }
  }, [baseline, workingCopy, coachId, mealPlanId]);

  const addMeal = useCallback((): string | null => {
    if (!workingCopy) return null;
    const before = workingCopy.meals.length;
    const next = addMealToDraft(workingCopy);
    setWorkingCopy(next);
    const added = next.meals[before];
    return added?.id ?? null;
  }, [workingCopy, setWorkingCopy]);

  const value = useMemo<MealPlanDraftContextValue>(
    () => ({
      loading,
      baseline,
      workingCopy,
      saveState,
      saveError,
      resumePrompt,
      isDirty: workingCopy && baseline ? hasUnsavedMealPlanChanges(workingCopy, baseline) : false,
      acceptResume,
      discardStoredDraft,
      discardToBaseline,
      commit,
      addMeal,
      removeMeal: (mealId) => {
        if (!workingCopy) return;
        setWorkingCopy(removeMealFromDraft(workingCopy, mealId));
      },
      updateMeal: (mealId, patch) => {
        if (!workingCopy) return;
        setWorkingCopy(updateMealInDraft(workingCopy, mealId, patch));
      },
      addOption: (mealId) => {
        if (!workingCopy) return;
        setWorkingCopy(addOptionToDraft(workingCopy, mealId));
      },
      removeOption: (mealId, optionId) => {
        if (!workingCopy) return false;
        const next = removeOptionFromDraft(workingCopy, mealId, optionId);
        if (!next) return false;
        setWorkingCopy(next);
        return true;
      },
      updateOption: (mealId, optionId, patch) => {
        if (!workingCopy) return;
        setWorkingCopy(updateOptionInDraft(workingCopy, mealId, optionId, patch));
      },
      addFood: (mealId, optionId, food) => {
        if (!workingCopy) return;
        setWorkingCopy(addFoodToDraft(workingCopy, mealId, optionId, food));
      },
      removeFood: (mealId, optionId, foodItemId) => {
        if (!workingCopy) return;
        setWorkingCopy(removeFoodFromDraft(workingCopy, mealId, optionId, foodItemId));
      },
      updateFoodQuantity: (mealId, optionId, foodItemId, quantity) => {
        if (!workingCopy) return;
        setWorkingCopy(updateFoodQuantityInDraft(workingCopy, mealId, optionId, foodItemId, quantity));
      },
      maxOptionsPerMeal: MAX_OPTIONS_PER_MEAL,
    }),
    [
      loading,
      baseline,
      workingCopy,
      saveState,
      saveError,
      resumePrompt,
      acceptResume,
      discardStoredDraft,
      discardToBaseline,
      commit,
      addMeal,
      setWorkingCopy,
    ],
  );

  return (
    <MealPlanDraftContext.Provider value={value}>{children}</MealPlanDraftContext.Provider>
  );
}
